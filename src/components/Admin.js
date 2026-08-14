import React, { useEffect, useMemo, useRef, useState } from 'react';
import './Admin.css';
import { db } from '../firebase';
import {
  ref,
  onValue,
  runTransaction,
  remove,
  onChildAdded,
  push,
  set,
  serverTimestamp
} from 'firebase/database';
import CalendarBookings from './CalendarBookings';

const INITIAL_STATUSES = {
  vr1: { status: 'Свободно', until: null },
  vr2: { status: 'Свободно', until: null },
  vr3: { status: 'Свободно', until: null },
  vr4: { status: 'Свободно', until: null },
  ps1: { status: 'Свободно', until: null },
  ps2: { status: 'Свободно', until: null },
  billiard1: { status: 'Свободно', until: null },
  billiard2: { status: 'Свободно', until: null },
  autosim1: { status: 'Свободно', until: null },
  autosim2: { status: 'Свободно', until: null }
};

const getLocalDayKeyFromTs = (ts) => {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');

  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const serviceCategory = (key) => {
  if (key.startsWith('vr')) {
    return 'vr';
  }

  if (key.startsWith('ps')) {
    return 'ps';
  }

  if (key.startsWith('billiard')) {
    return 'billiard';
  }

  if (
    key.startsWith('sim') ||
    key.startsWith('autosim')
  ) {
    return 'sim';
  }

  return 'other';
};

const isCancelledBooking = (booking) => {
  return String(
    booking?.status || ''
  ).toLowerCase() === 'cancelled';
};

export default function Admin() {
  const DRINKS = useMemo(
    () => ({
      cola_05: { name: 'Coca-Cola 0.5 l', price: 18 },
      fanta_05: { name: 'Fanta 0.5 l', price: 18 },
      sprite_05: { name: 'Sprite 0.5 l', price: 18 },
      schweppes_033: { name: 'Schweppes 0.33 l', price: 16 },
      dorna_05: { name: 'Dorna 0.5 l', price: 14 },
      frunzea_05: { name: 'Ceai Frunzea 0.5 l', price: 21 },
      cappy_02: { name: 'Cappy 0.2 l', price: 13 },
      monster_05: { name: 'Monster 0.5 l', price: 32 },
      burn_0250: { name: 'Burn 0.25 l', price: 25 },
      cola_033: { name: 'Coca-Cola 0.33 l', price: 15 },
      fanta_033: { name: 'Fanta 0.33 l', price: 15 },
      sprite_033: { name: 'Sprite 0.33 l', price: 15 },
      redbull_025: { name: 'Red Bull 0.25 l', price: 26 }
    }),
    []
  );

  const DRINK_KEYS = useMemo(
    () => Object.keys(DRINKS),
    [DRINKS]
  );

  const [statuses, setStatuses] =
    useState(INITIAL_STATUSES);

  const [selectedItem, setSelectedItem] =
    useState(null);

  const [hours, setHours] =
    useState(0);

  const [minutes, setMinutes] =
    useState(30);

  const [dailyStats, setDailyStats] =
    useState({
      vr: 0,
      ps: 0,
      billiard: 0,
      sim: 0,
      revenueMDL: 0
    });

  const [bookingsAll, setBookingsAll] =
    useState([]);

  const [logs, setLogs] =
    useState([]);

  const [drinkStock, setDrinkStock] =
    useState({});

  const [shipmentCart, setShipmentCart] =
    useState({});

  const [saleCart, setSaleCart] =
    useState({});

  const [todaySales, setTodaySales] =
    useState([]);

  const [uiMsg, setUiMsg] =
    useState('');

  const [
    drinkActionBusy,
    setDrinkActionBusy
  ] = useState(false);

  const drinkActionLockRef =
    useRef(false);

  const [showShipment, setShowShipment] =
    useState(false);

  const [showSale, setShowSale] =
    useState(false);

  const [serverOffset, setServerOffset] =
    useState(0);

  const serverNow = useMemo(
    () => () =>
      Date.now() + serverOffset,
    [serverOffset]
  );

  const [todayKey, setTodayKey] =
    useState(() =>
      getLocalDayKeyFromTs(Date.now())
    );

  useEffect(() => {
    const offsetRef = ref(
      db,
      '.info/serverTimeOffset'
    );

    const unsubscribe = onValue(
      offsetRef,
      (snapshot) => {
        setServerOffset(
          snapshot.val() || 0
        );
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const updateDay = () => {
      setTodayKey(
        getLocalDayKeyFromTs(
          serverNow()
        )
      );
    };

    const intervalId =
      setInterval(
        updateDay,
        60_000
      );

    updateDay();

    return () =>
      clearInterval(intervalId);
  }, [serverNow]);

  const addLog = async (
    entry,
    timestamp = serverNow()
  ) => {
    const dayKey =
      getLocalDayKeyFromTs(timestamp);

    const logRef = ref(
      db,
      `logs/${dayKey}`
    );

    return push(logRef, {
      timestamp,
      entry
    });
  };

  useEffect(() => {
    const logRef = ref(
      db,
      `logs/${todayKey}`
    );

    const unsubscribe = onValue(
      logRef,
      (snapshot) => {
        const data =
          snapshot.val() || {};

        const list =
          Object.values(data)
            .sort(
              (first, second) =>
                first.timestamp -
                second.timestamp
            )
            .map(
              (item) =>
                `${new Date(
                  item.timestamp
                ).toLocaleString()}: ${
                  item.entry
                }`
            );

        setLogs(list);
      }
    );

    return () => unsubscribe();
  }, [todayKey]);

  const prevStatusesRef =
    useRef(INITIAL_STATUSES);

  useEffect(() => {
    const statusesRef =
      ref(db, 'statuses');

    const unsubscribe = onValue(
      statusesRef,
      (snapshot) => {
        const data =
          snapshot.val() || {};

        const merged = {
          ...INITIAL_STATUSES,
          ...data
        };

        const currentTime =
          serverNow();

        const previous =
          prevStatusesRef.current ||
          {};

        Object.entries(merged)
          .forEach(([key, value]) => {
            const previousValue =
              previous[key] || {};

            const unexpectedReset =
              previousValue.status ===
                'Занято' &&
              value.status ===
                'Свободно' &&
              (
                previousValue.until || 0
              ) >
                currentTime + 2000;

            if (
              unexpectedReset &&
              !value.reason &&
              !value.updatedBy
            ) {
              addLog(
                `⚠️ Неожиданный сброс ${key}. Возможен внешний клиент или другая вкладка.`
              ).catch(console.error);
            }
          });

        prevStatusesRef.current =
          merged;

        setStatuses(merged);
      }
    );

    return () => unsubscribe();
  }, [serverNow]);

  useEffect(() => {
    const statsRef = ref(
      db,
      `dailyStats/${todayKey}`
    );

    const unsubscribe = onValue(
      statsRef,
      (snapshot) => {
        const data =
          snapshot.val() || {};

        setDailyStats({
          vr: 0,
          ps: 0,
          billiard: 0,
          sim: 0,
          revenueMDL: 0,
          ...data
        });
      }
    );

    return () => unsubscribe();
  }, [todayKey]);

  useEffect(() => {
    const bookingsRef =
      ref(db, 'bookings');

    const unsubscribeList = onValue(
      bookingsRef,
      (snapshot) => {
        const data =
          snapshot.val() || {};

        const list =
          Object.entries(data)
            .map(([id, entry]) => ({
              id,
              ...entry
            }));

        setBookingsAll(list);
      }
    );

    const unsubscribeAdded =
      onChildAdded(
        bookingsRef,
        (snapshot) => {
          const booking =
            snapshot.val();

          if (
            !booking ||
            isCancelledBooking(booking)
          ) {
            return;
          }

          addLog(
            `Новое бронирование: ${booking.name}, ${booking.service}, ${booking.date} в ${booking.time}`
          ).catch(console.error);
        }
      );

    return () => {
      unsubscribeList();
      unsubscribeAdded();
    };
  }, []);

  const bookingsVisible =
    useMemo(
      () =>
        bookingsAll.filter(
          (booking) =>
            !isCancelledBooking(
              booking
            )
        ),
      [bookingsAll]
    );

  useEffect(() => {
    const stockRef = ref(
      db,
      'drinks/stock'
    );

    const unsubscribe = onValue(
      stockRef,
      (snapshot) => {
        setDrinkStock(
          snapshot.val() || {}
        );
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const salesRef = ref(
      db,
      `sales/${todayKey}/drinks`
    );

    const unsubscribe = onValue(
      salesRef,
      (snapshot) => {
        const data =
          snapshot.val() || {};

        setTodaySales(
          Object.values(data).sort(
            (first, second) =>
              Number(second.timestamp || 0) -
              Number(first.timestamp || 0)
          )
        );
      }
    );

    return () => unsubscribe();
  }, [todayKey]);

  const newId = () => {
    if (
      typeof crypto !==
        'undefined' &&
      crypto.randomUUID
    ) {
      return crypto.randomUUID();
    }

    return (
      `${Date.now()}-` +
      Math.random()
        .toString(16)
        .slice(2)
    );
  };

  const firebaseErrorText = (
    error
  ) => {
    const code = String(
      error?.code || ''
    );

    const message = String(
      error?.message || ''
    );

    const normalized =
      `${code} ${message}`
        .toLowerCase();

    if (
      normalized.includes(
        'permission-denied'
      ) ||
      normalized.includes(
        'permission_denied'
      )
    ) {
      return (
        'Firebase запретила запись. ' +
        'Проверьте Database Rules для ' +
        'drinks, sales, dailyStats и logs.'
      );
    }

    if (
      normalized.includes('network')
    ) {
      return (
        'Нет соединения с Firebase. ' +
        'Проверьте интернет.'
      );
    }

    return (
      message ||
      code ||
      'Неизвестная ошибка Firebase'
    );
  };

  const resetStatusTx = async (
    key,
    reason = 'system-auto'
  ) => {
    try {
      const result =
        await runTransaction(
          ref(
            db,
            `statuses/${key}`
          ),
          (currentValue) => {
            const current =
              currentValue || {
                status: 'Свободно',
                until: null
              };

            const expired =
              (
                current.until || 0
              ) <= serverNow();

            if (
              current.status ===
                'Занято' &&
              (
                expired ||
                reason ===
                  'manual-reset'
              )
            ) {
              return {
                status: 'Свободно',
                until: null,
                leaseId: null,

                updatedBy:
                  reason ===
                    'manual-reset'
                    ? 'admin'
                    : 'system',

                reason,
                updatedAt:
                  serverTimestamp()
              };
            }

            return current;
          }
        );

      const after =
        result?.snapshot?.val();

      if (
        result?.committed &&
        after?.status ===
          'Свободно'
      ) {
        addLog(
          `Сброс ${key} — статус «Свободно» (${reason})`
        ).catch(console.error);
      }
    } catch (error) {
      console.error(error);

      addLog(
        `Ошибка сброса ${key}: ${error.message}`
      ).catch(console.error);
    }
  };

  const confirmBooking =
    async () => {
      if (!selectedItem) {
        return;
      }

      const totalMs =
        (
          Number(hours) || 0
        ) *
          3_600_000 +
        (
          Number(minutes) || 0
        ) *
          60_000;

      if (totalMs <= 0) {
        return;
      }

      const until =
        serverNow() + totalMs;

      const leaseId = newId();

      try {
        const result =
          await runTransaction(
            ref(
              db,
              `statuses/${selectedItem}`
            ),
            (currentValue) => {
              const current =
                currentValue || {
                  status: 'Свободно',
                  until: null
                };

              const expired =
                (
                  current.until || 0
                ) <= serverNow();

              if (
                current.status ===
                  'Свободно' ||
                expired
              ) {
                return {
                  status: 'Занято',
                  until,
                  leaseId,
                  updatedBy:
                    'admin',
                  reason:
                    'manual-booking',
                  updatedAt:
                    serverTimestamp()
                };
              }

              return current;
            }
          );

        const after =
          result?.snapshot?.val();

        const booked =
          result?.committed &&
          after?.status ===
            'Занято' &&
          after?.leaseId ===
            leaseId;

        if (booked) {
          addLog(
            `Бронирование ${selectedItem}: ${hours} ч ${minutes} мин`
          ).catch(console.error);

          const category =
            serviceCategory(
              selectedItem
            );

          await runTransaction(
            ref(
              db,
              `dailyStats/${todayKey}/${category}`
            ),
            (currentValue) =>
              (
                Number(
                  currentValue
                ) || 0
              ) + totalMs
          );

          setSelectedItem(null);
          setHours(0);
          setMinutes(30);
        } else {
          addLog(
            `Не удалось забронировать ${selectedItem}: уже занято`
          ).catch(console.error);
        }
      } catch (error) {
        console.error(error);

        addLog(
          `Ошибка бронирования ${selectedItem}: ${error.message}`
        ).catch(console.error);
      }
    };

  const deleteBooking =
    async (id) => {
      try {
        await remove(
          ref(
            db,
            `bookings/${id}`
          )
        );

        addLog(
          `Удалено бронирование ID=${id}`
        ).catch(console.error);
      } catch (error) {
        console.error(error);

        addLog(
          `Ошибка удаления брони ID=${id}: ${error.message}`
        ).catch(console.error);
      }
    };

  const resetBooking =
    async () => {
      if (!selectedItem) {
        return;
      }

      await resetStatusTx(
        selectedItem,
        'manual-reset'
      );

      setSelectedItem(null);
      setHours(0);
      setMinutes(30);
    };

  const extendBooking =
    async () => {
      if (!selectedItem) {
        return;
      }

      const totalMs =
        (Number(hours) || 0) *
          3_600_000 +
        (Number(minutes) || 0) *
          60_000;

      if (totalMs <= 0) {
        setUiMsg(
          'Укажите время, которое нужно добавить.'
        );
        return;
      }

      const item = selectedItem;

      try {
        const result = await runTransaction(
          ref(db, `statuses/${item}`),
          (currentValue) => {
            const current =
              currentValue || {};

            if (
              current.status !==
              'Занято'
            ) {
              return;
            }

            const baseUntil = Math.max(
              Number(current.until || 0),
              serverNow()
            );

            return {
              ...current,
              until: baseUntil + totalMs,
              updatedBy: 'admin',
              reason: 'manual-extension',
              updatedAt: serverTimestamp()
            };
          }
        );

        if (!result?.committed) {
          setUiMsg(
            'Время не добавлено: зона уже освободилась.'
          );
          return;
        }

        const category =
          serviceCategory(item);

        await runTransaction(
          ref(
            db,
            `dailyStats/${todayKey}/${category}`
          ),
          (currentValue) =>
            (Number(currentValue) || 0) +
            totalMs
        );

        await addLog(
          `Добавлено время ${item}: ${hours} ч ${minutes} мин`
        );

        setUiMsg(
          `Для ${item.toUpperCase()} добавлено: ${hours} ч ${minutes} мин.`
        );
        setSelectedItem(null);
        setHours(0);
        setMinutes(30);
      } catch (error) {
        console.error(error);
        setUiMsg(
          `Не удалось добавить время: ${firebaseErrorText(error)}`
        );
      }
    };

  const setCartQty =
    (setter) =>
    (sku, value) => {
      const quantity = Math.max(
        0,
        Math.floor(
          Number(value) || 0
        )
      );

      setter((previous) => {
        const next = {
          ...previous
        };

        if (quantity === 0) {
          delete next[sku];
        } else {
          next[sku] = quantity;
        }

        return next;
      });
    };

  const incrementCart =
    (setter) =>
    (sku, step = 1) => {
      setter((previous) => {
        const current =
          Number(
            previous[sku] || 0
          );

        const quantity =
          Math.max(
            0,
            current + step
          );

        const next = {
          ...previous
        };

        if (quantity === 0) {
          delete next[sku];
        } else {
          next[sku] = quantity;
        }

        return next;
      });
    };

  const decrementCart =
    (setter) =>
    (sku, step = 1) => {
      setter((previous) => {
        const current =
          Number(
            previous[sku] || 0
          );

        const quantity =
          Math.max(
            0,
            current - step
          );

        const next = {
          ...previous
        };

        if (quantity === 0) {
          delete next[sku];
        } else {
          next[sku] = quantity;
        }

        return next;
      });
    };

  const shipmentCount = useMemo(
    () =>
      Object.values(
        shipmentCart
      ).reduce(
        (sum, quantity) =>
          sum + quantity,
        0
      ),
    [shipmentCart]
  );

  const saleCount = useMemo(
    () =>
      Object.values(
        saleCart
      ).reduce(
        (sum, quantity) =>
          sum + quantity,
        0
      ),
    [saleCart]
  );

  const saleTotal = useMemo(
    () =>
      Object.entries(
        saleCart
      ).reduce(
        (
          sum,
          [sku, quantity]
        ) =>
          sum +
          (
            DRINKS[sku]
              ?.price || 0
          ) *
            quantity,
        0
      ),
    [saleCart]
  );

  const saleInsufficient =
    useMemo(
      () =>
        Object.entries(
          saleCart
        ).some(
          ([sku, quantity]) =>
            Number(
              drinkStock?.[
                sku
              ] || 0
            ) < quantity
        ),
      [saleCart, drinkStock]
    );

  const commitInventoryOperation =
    async ({
      type,
      entries,
      totalSum = 0
    }) => {
      const operationId = newId();
      const timestamp = serverNow();

      const dayKey =
        getLocalDayKeyFromTs(
          timestamp
        );

      let stockCommitted = false;
      let stockAfter = {};
      let abortReason = '';

      if (
        type !== 'sale' &&
        type !== 'shipment'
      ) {
        return {
          ok: false,
          operationId,
          errorText:
            'Неизвестный тип операции'
        };
      }

      try {
        /*
         * Транзакция выполняется только
         * для остатков напитков.
         *
         * Бронирования, статусы и логи
         * больше не создают конфликт.
         */
        const result =
          await runTransaction(
            ref(db, 'drinks/stock'),
            (stockValue) => {
              const stock =
                stockValue &&
                typeof stockValue ===
                  'object'
                  ? {
                      ...stockValue
                    }
                  : {};

              for (
                const [
                  sku,
                  rawQuantity
                ] of entries
              ) {
                const quantity =
                  Math.floor(
                    Number(
                      rawQuantity
                    )
                  );

                if (
                  !DRINKS[sku] ||
                  !Number.isFinite(
                    quantity
                  ) ||
                  quantity <= 0
                ) {
                  abortReason =
                    'invalid-quantity';
                  return;
                }

                const current =
                  Number(
                    stock[sku] || 0
                  );

                if (
                  !Number.isFinite(
                    current
                  ) ||
                  current < 0
                ) {
                  abortReason =
                    'invalid-stock';
                  return;
                }

                const next =
                  type === 'sale'
                    ? current -
                      quantity
                    : current +
                      quantity;

                if (next < 0) {
                  abortReason =
                    'insufficient-stock';
                  return;
                }

                stock[sku] = next;
              }

              return stock;
            }
          );

        if (!result?.committed) {
          return {
            ok: false,
            reason:
              abortReason ||
              'transaction-aborted',

            operationId,

            stock:
              result?.snapshot
                ?.val() || {}
          };
        }

        stockAfter =
          result.snapshot.val() || {};

        stockCommitted = true;

        await set(
          ref(
            db,
            `drinks/operations/${operationId}`
          ),
          {
            id: operationId,
            type,
            timestamp,
            dayKey,
            totalSum: Number(
              totalSum || 0
            ),
            items: Object.fromEntries(
              entries.map(
                ([sku, quantity]) => [
                  sku,
                  Number(quantity)
                ]
              )
            )
          }
        );

        if (type === 'sale') {
          for (
            const [
              sku,
              rawQuantity
            ] of entries
          ) {
            const quantity =
              Number(rawQuantity);

            const drink =
              DRINKS[sku];

            await set(
              ref(
                db,
                `sales/${dayKey}/drinks/${operationId}_${sku}`
              ),
              {
                operationId,
                timestamp,
                sku,
                name: drink.name,
                quantity,
                qty: quantity,
                price:
                  drink.price,

                total:
                  drink.price *
                  quantity
              }
            );
          }

          /*
           * operationId не позволяет
           * одной продаже попасть в
           * выручку дважды.
           */
          await runTransaction(
            ref(
              db,
              `dailyStats/${dayKey}`
            ),
            (dayValue) => {
              const day =
                dayValue &&
                typeof dayValue ===
                  'object'
                  ? {
                      ...dayValue
                    }
                  : {};

              const operations =
                day.revenueOperations &&
                typeof day
                  .revenueOperations ===
                  'object'
                  ? {
                      ...day
                        .revenueOperations
                    }
                  : {};

              if (
                operations[
                  operationId
                ]
              ) {
                return day;
              }

              day.revenueMDL =
                Number(
                  day.revenueMDL ||
                    0
                ) +
                Number(
                  totalSum || 0
                );

              operations[
                operationId
              ] = {
                timestamp,

                totalSum:
                  Number(
                    totalSum || 0
                  )
              };

              day.revenueOperations =
                operations;

              return day;
            }
          );
        }

        return {
          ok: true,
          operationId,
          stock: stockAfter
        };
      } catch (error) {
        console.error(
          'Ошибка операции со складом:',
          error
        );

        /*
         * Если товар уже списан,
         * нельзя предлагать повторить
         * продажу — это спишет его
         * второй раз.
         */
        if (stockCommitted) {
          return {
            ok: true,
            operationId,
            stock: stockAfter,

            warning:
              'Склад изменён, но ' +
              'история или статистика ' +
              'записалась не полностью: ' +
              firebaseErrorText(error)
          };
        }

        return {
          ok: false,
          operationId,
          error,

          errorText:
            firebaseErrorText(error)
        };
      }
    };

  const addShipmentAll =
    async () => {
      const entries =
        Object.entries(
          shipmentCart
        ).filter(
          ([, quantity]) =>
            quantity > 0
        );

      if (
        !entries.length ||
        drinkActionLockRef.current
      ) {
        return;
      }

      setUiMsg('');
      drinkActionLockRef.current =
        true;

      setDrinkActionBusy(true);

      try {
        const transaction =
          await commitInventoryOperation({
            type: 'shipment',
            entries
          });

        if (!transaction.ok) {
          setUiMsg(
            transaction.reason ===
              'insufficient-stock'
              ? 'Поступление не применено: некорректное количество.'
              : `Поступление не применено: ${
                  transaction.errorText ||
                  'ошибка Firebase'
                }`
          );

          return;
        }

        for (
          const [
            sku,
            quantity
          ] of entries
        ) {
          const drink =
            DRINKS[sku];

          const remaining =
            Number(
              transaction.stock?.[
                sku
              ] || 0
            );

          await addLog(
            `Поступление напитков: ${drink.name} × ${quantity} (остаток: ${remaining})`
          ).catch((error) => {
            console.error(
              'Не удалось записать журнал:',
              error
            );
          });
        }

        setShipmentCart({});
        setShowShipment(false);

        setUiMsg(
          transaction.warning ||
            `Поступление добавлено: ${
              entries.length
            } поз., всего ${
              entries.reduce(
                (
                  sum,
                  [, quantity]
                ) =>
                  sum + quantity,
                0
              )
            } шт.`
        );
      } catch (error) {
        console.error(error);

        setUiMsg(
          'Ошибка при добавлении поступления'
        );
      } finally {
        drinkActionLockRef.current =
          false;

        setDrinkActionBusy(false);
      }
    };

  const sellAll = async () => {
    const entries =
      Object.entries(
        saleCart
      ).filter(
        ([, quantity]) =>
          quantity > 0
      );

    if (
      !entries.length ||
      drinkActionLockRef.current
    ) {
      return;
    }

    setUiMsg('');

    const insufficient =
      entries.some(
        ([sku, quantity]) =>
          Number(
            drinkStock?.[sku] ||
              0
          ) < quantity
      );

    if (insufficient) {
      setUiMsg(
        'Недостаточно на складе для выбранных позиций'
      );

      return;
    }

    drinkActionLockRef.current =
      true;

    setDrinkActionBusy(true);

    try {
      const totalSum =
        entries.reduce(
          (
            sum,
            [sku, quantity]
          ) =>
            sum +
            (
              DRINKS[sku]
                ?.price || 0
            ) *
              quantity,
          0
        );

      const transaction =
        await commitInventoryOperation({
          type: 'sale',
          entries,
          totalSum
        });

      if (!transaction.ok) {
        setUiMsg(
          transaction.reason ===
            'insufficient-stock'
            ? 'Продажа не выполнена: фактического остатка уже недостаточно.'
            : `Продажа не выполнена: ${
                transaction.errorText ||
                'ошибка Firebase'
              }`
        );

        return;
      }

      for (
        const [
          sku,
          quantity
        ] of entries
      ) {
        const drink =
          DRINKS[sku];

        const remaining =
          Number(
            transaction.stock?.[
              sku
            ] || 0
          );

        await addLog(
          `Продажа: ${drink.name} × ${quantity} = ${
            drink.price *
            quantity
          } MDL (остаток: ${remaining})`
        ).catch((error) => {
          console.error(
            'Не удалось записать журнал:',
            error
          );
        });
      }

      /*
       * Корзина очищается после
       * успешного списания.
       */
      setSaleCart({});
      setShowSale(false);

      setUiMsg(
        transaction.warning ||
          `Продано: ${
            entries.length
          } поз. / ${
            entries.reduce(
              (
                sum,
                [, quantity]
              ) =>
                sum + quantity,
              0
            )
          } шт. На сумму ${totalSum} MDL`
      );
    } catch (error) {
      console.error(error);

      setUiMsg(
        `Ошибка при продаже: ${
          firebaseErrorText(error)
        }`
      );
    } finally {
      drinkActionLockRef.current =
        false;

      setDrinkActionBusy(false);
    }
  };

  useEffect(() => {
    const intervalId =
      setInterval(() => {
        Object.entries(statuses)
          .forEach(
            ([key, value]) => {
              if (
                value?.status ===
                  'Занято' &&
                (
                  value?.until || 0
                ) <= serverNow()
              ) {
                resetStatusTx(
                  key,
                  'sweeper'
                );
              }
            }
          );
      }, 30_000);

    return () =>
      clearInterval(intervalId);
  }, [statuses, serverNow]);

  const downloadLog = () => {
    const format = (ms) => {
      const hoursValue =
        Math.floor(
          ms / 3_600_000
        );

      const minutesValue =
        Math.floor(
          (
            ms %
            3_600_000
          ) /
            60_000
        );

      return (
        `${hoursValue} ч ` +
        `${minutesValue} мин`
      );
    };

    const lines = [
      '=== История событий ===',
      ...logs,
      '',
      '=== Итоги за день ===',
      `Дата: ${todayKey}`,
      `VR: ${format(dailyStats.vr)}`,
      `PlayStation: ${format(dailyStats.ps)}`,
      `Бильярд: ${format(dailyStats.billiard)}`,
      `Автосимулятор: ${format(dailyStats.sim)}`,
      `Выручка (напитки): ${Number(
        dailyStats.revenueMDL || 0
      ).toFixed(2)} MDL`
    ];

    const blob = new Blob(
      [lines.join('\n')],
      {
        type: 'text/plain'
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement('a');

    anchor.href = url;
    anchor.download =
      `log_${todayKey}.txt`;

    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-panel">
      <button
        className="button-log"
        onClick={downloadLog}
      >
        Скачать статистику
      </button>

      <div className="row row-top">
        <div className="stats-display">
          <p>
            Дата: {todayKey}
          </p>

          <p>
            VR:{' '}
            {Math.floor(
              dailyStats.vr /
                3_600_000
            )}{' '}
            ч{' '}
            {Math.floor(
              (
                dailyStats.vr %
                3_600_000
              ) /
                60_000
            )}{' '}
            мин
          </p>

          <p>
            PlayStation:{' '}
            {Math.floor(
              dailyStats.ps /
                3_600_000
            )}{' '}
            ч{' '}
            {Math.floor(
              (
                dailyStats.ps %
                3_600_000
              ) /
                60_000
            )}{' '}
            мин
          </p>

          <p>
            Бильярд:{' '}
            {Math.floor(
              dailyStats.billiard /
                3_600_000
            )}{' '}
            ч{' '}
            {Math.floor(
              (
                dailyStats.billiard %
                3_600_000
              ) /
                60_000
            )}{' '}
            мин
          </p>

          <p>
            Автосимулятор:{' '}
            {Math.floor(
              dailyStats.sim /
                3_600_000
            )}{' '}
            ч{' '}
            {Math.floor(
              (
                dailyStats.sim %
                3_600_000
              ) /
                60_000
            )}{' '}
            мин
          </p>

          <p>
            Выручка (напитки):{' '}
            {Number(
              dailyStats
                .revenueMDL || 0
            ).toFixed(2)}{' '}
            MDL
          </p>

          <div className="sales-history">
            <strong>
              Продажи напитков сегодня:
            </strong>

            {todaySales.length === 0 ? (
              <p>Продаж пока нет</p>
            ) : (
              <ul>
                {todaySales.map(
                  (sale, index) => (
                    <li
                      key={
                        `${sale.operationId || 'sale'}-${sale.sku || index}`
                      }
                    >
                      {new Date(
                        Number(
                          sale.timestamp || 0
                        )
                      ).toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit'
                        }
                      )}{' '}
                      — {sale.name}{' '}
                      × {Number(
                        sale.quantity ||
                          sale.qty || 0
                      )}{' '}
                      — {Number(
                        sale.total || 0
                      ).toFixed(2)} MDL
                    </li>
                  )
                )}
              </ul>
            )}
          </div>
        </div>

        <CalendarBookings
          bookingsList={
            bookingsVisible
          }
          onDelete={
            deleteBooking
          }
        />
      </div>

      <div className="row row-bottom">
        <div className="admin-plates">
          {Object.entries(
            statuses
          ).map(
            ([key, value]) => (
              <div
                key={key}
                className={
                  `admin-box ${
                    value.status ===
                    'Занято'
                      ? 'busy'
                      : 'free'
                  }`
                }
                onClick={() =>
                  setSelectedItem(
                    key
                  )
                }
              >
                <strong>
                  {key.toUpperCase()}
                </strong>

                <div>
                  {value.status}

                  {value.until && (
                    <small>
                      {' '}
                      до{' '}
                      {new Date(
                        value.until
                      ).toLocaleTimeString()}
                    </small>
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {selectedItem && (
          <div className="popup">
            {statuses[
              selectedItem
            ]?.status ===
            'Занято' ? (
              <>
                <h3>
                  {selectedItem.toUpperCase()}{' '}
                  занят до{' '}
                  {new Date(
                    statuses[
                      selectedItem
                    ].until
                  ).toLocaleTimeString()}
                </h3>

                <label>
                  Добавить часов:{' '}
                  <input
                    type="number"
                    value={hours}
                    min={0}
                    max={12}
                    onChange={(event) =>
                      setHours(
                        Math.max(
                          0,
                          Math.min(
                            12,
                            Number(
                              event.target.value
                            )
                          )
                        )
                      )
                    }
                  />
                </label>

                <label>
                  Добавить минут:{' '}
                  <input
                    type="number"
                    value={minutes}
                    min={0}
                    max={59}
                    step={15}
                    onChange={(event) =>
                      setMinutes(
                        Math.max(
                          0,
                          Math.min(
                            59,
                            Number(
                              event.target.value
                            )
                          )
                        )
                      )
                    }
                  />
                </label>

                <button
                  onClick={extendBooking}
                >
                  Добавить время
                </button>

                <button
                  onClick={
                    resetBooking
                  }
                >
                  Сбросить
                </button>

                <button
                  onClick={() =>
                    setSelectedItem(
                      null
                    )
                  }
                >
                  Закрыть
                </button>
              </>
            ) : (
              <>
                <h3>
                  Забронировать{' '}
                  {selectedItem.toUpperCase()}
                </h3>

                <label>
                  Часы:{' '}

                  <input
                    type="number"
                    value={hours}
                    min={0}
                    max={12}
                    onChange={(
                      event
                    ) =>
                      setHours(
                        Math.max(
                          0,
                          Math.min(
                            12,
                            Number(
                              event
                                .target
                                .value
                            )
                          )
                        )
                      )
                    }
                  />
                </label>

                <label>
                  Минуты:{' '}

                  <input
                    type="number"
                    value={minutes}
                    min={0}
                    max={59}
                    step={15}
                    onChange={(
                      event
                    ) =>
                      setMinutes(
                        Math.max(
                          0,
                          Math.min(
                            59,
                            Number(
                              event
                                .target
                                .value
                            )
                          )
                        )
                      )
                    }
                  />
                </label>

                <button
                  onClick={
                    confirmBooking
                  }
                >
                  Подтвердить
                </button>

                <button
                  onClick={() =>
                    setSelectedItem(
                      null
                    )
                  }
                >
                  Отмена
                </button>
              </>
            )}
          </div>
        )}

        <div className="drinks-section">
          <h3>Напитки</h3>

          <div className="drinks-forms">
            <div
              className={
                `form-block panel ${
                  showShipment
                    ? ''
                    : 'collapsed'
                }`
              }
            >
              <div
                className="panel-head"
                onClick={() =>
                  setShowShipment(
                    (value) =>
                      !value
                  )
                }
              >
                <h4>Поступление</h4>

                <button
                  type="button"
                  className="panel-toggle"
                >
                  {showShipment
                    ? 'Свернуть'
                    : 'Открыть'}
                </button>
              </div>

              <div className="panel-body">
                <ul className="drinks-list">
                  {DRINK_KEYS.map(
                    (sku) => {
                      const drink =
                        DRINKS[sku];

                      const stock =
                        Number(
                          drinkStock?.[
                            sku
                          ] || 0
                        );

                      const quantity =
                        shipmentCart[
                          sku
                        ] || 0;

                      return (
                        <li
                          key={sku}
                          className={
                            `drink-row ${
                              quantity >
                              0
                                ? 'selected'
                                : ''
                            }`
                          }
                        >
                          <span className="drink-name">
                            {drink.name}
                          </span>

                          <span className="drink-price">
                            {drink.price}{' '}
                            MDL
                          </span>

                          <span className="drink-stock">
                            На складе:{' '}
                            {stock}
                          </span>

                          <div className="qty-controls">
                            <button
                              type="button"
                              className="qty-controls-button"
                              onClick={() =>
                                decrementCart(
                                  setShipmentCart
                                )(
                                  sku,
                                  1
                                )
                              }
                            >
                              −
                            </button>

                            <input
                              type="number"
                              min={0}
                              value={
                                quantity
                              }
                              onChange={(
                                event
                              ) =>
                                setCartQty(
                                  setShipmentCart
                                )(
                                  sku,
                                  event
                                    .target
                                    .value
                                )
                              }
                            />

                            <button
                              type="button"
                              className="qty-controls-button"
                              onClick={() =>
                                incrementCart(
                                  setShipmentCart
                                )(
                                  sku,
                                  1
                                )
                              }
                            >
                              +
                            </button>
                          </div>
                        </li>
                      );
                    }
                  )}
                </ul>

                <div className="sell-total">
                  К добавлению:{' '}
                  {shipmentCount}{' '}
                  шт.
                </div>

                <button
                  onClick={
                    addShipmentAll
                  }
                  disabled={
                    shipmentCount ===
                      0 ||
                    drinkActionBusy
                  }
                >
                  {drinkActionBusy
                    ? 'Сохранение…'
                    : 'Добавить поступление'}
                </button>
              </div>
            </div>

            <div
              className={
                `form-block panel ${
                  showSale
                    ? ''
                    : 'collapsed'
                }`
              }
            >
              <div
                className="panel-head"
                onClick={() =>
                  setShowSale(
                    (value) =>
                      !value
                  )
                }
              >
                <h4>Продажа</h4>

                <button
                  type="button"
                  className="panel-toggle"
                >
                  {showSale
                    ? 'Свернуть'
                    : 'Открыть'}
                </button>
              </div>

              <div className="panel-body">
                <ul className="drinks-list">
                  {DRINK_KEYS.map(
                    (sku) => {
                      const drink =
                        DRINKS[sku];

                      const stock =
                        Number(
                          drinkStock?.[
                            sku
                          ] || 0
                        );

                      const quantity =
                        saleCart[
                          sku
                        ] || 0;

                      const insufficient =
                        quantity >
                        stock;

                      return (
                        <li
                          key={sku}
                          className={
                            `drink-row ${
                              quantity >
                              0
                                ? 'selected'
                                : ''
                            }`
                          }
                        >
                          <span className="drink-name">
                            {drink.name}
                          </span>

                          <span className="drink-price">
                            {drink.price}{' '}
                            MDL
                          </span>

                          <span className="drink-stock">
                            На складе:{' '}
                            {stock}
                          </span>

                          <div className="qty-controls">
                            <button
                              type="button"
                              className="qty-controls-button"
                              onClick={() =>
                                decrementCart(
                                  setSaleCart
                                )(
                                  sku,
                                  1
                                )
                              }
                            >
                              −
                            </button>

                            <input
                              type="number"
                              min={0}
                              value={
                                quantity
                              }
                              onChange={(
                                event
                              ) =>
                                setCartQty(
                                  setSaleCart
                                )(
                                  sku,
                                  event
                                    .target
                                    .value
                                )
                              }
                            />

                            <button
                              type="button"
                              className="qty-controls-button"
                              onClick={() =>
                                incrementCart(
                                  setSaleCart
                                )(
                                  sku,
                                  1
                                )
                              }
                            >
                              +
                            </button>
                          </div>

                          {insufficient && (
                            <small className="stock-info">
                              Недостаточно
                              на складе
                            </small>
                          )}
                        </li>
                      );
                    }
                  )}
                </ul>

                <div className="sell-total">
                  К оплате:{' '}
                  {saleTotal.toFixed(
                    2
                  )}{' '}
                  MDL
                </div>

                {saleCount > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setSaleCart({})
                    }
                    disabled={
                      drinkActionBusy
                    }
                  >
                    Очистить выбранное
                  </button>
                )}

                <button
                  onClick={sellAll}
                  disabled={
                    saleCount === 0 ||
                    saleInsufficient ||
                    drinkActionBusy
                  }
                  title={
                    saleInsufficient
                      ? 'Недостаточно на складе'
                      : undefined
                  }
                >
                  {drinkActionBusy
                    ? 'Сохранение…'
                    : 'Продать выбранное'}
                </button>
              </div>
            </div>
          </div>

          {uiMsg && (
            <div className="ui-msg">
              {uiMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}