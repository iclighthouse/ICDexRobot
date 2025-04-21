import { Component, Vue } from 'vue-property-decorator';
import {
  BinanceOrderInfoDB,
  BinanceSymbol,
  DexSetting,
  ExchangeName,
  FilledBalance,
  Fills,
  ICDexOrderInfoDB,
  OrderInfoDB,
  OrderRow,
  RobotICDexInfo,
  RobotPairInfoDB,
  TokenInfo
} from '@/views/home/model';
import {
  ICDexCompletedFilled,
  ICDexOrder,
  ICDexPendingFilled,
  OrderPrice
} from '@/ic/ICDex/model';
import BigNumber from 'bignumber.js';
@Component({})
export class ICDexOrderMixin extends Vue {
  public getBinanceSymbol(
    symbol: string,
    robotPairInfo: RobotPairInfoDB
  ): { base: string; quote: string } {
    if (robotPairInfo) {
      const pairInfo = robotPairInfo[symbol] as BinanceSymbol;
      if (pairInfo) {
        return {
          base: pairInfo.baseAsset,
          quote: pairInfo.quoteAsset
        };
      }
    }
    return {
      base: '',
      quote: ''
    };
  }
  public getOrderStatus(val: OrderInfoDB): string {
    if (val) {
      val = val as ICDexOrderInfoDB;
      return val.status;
    }
    return 'Failed';
  }
  public filterOrderVal(val: string): string {
    if (val) {
      let decimalsNum = 8;
      if (decimalsNum > 4 && new BigNumber(val).abs().gt(0.001)) {
        decimalsNum = 4;
      }
      return new BigNumber(val).decimalPlaces(decimalsNum, 1).toString(10);
    }
    return '';
  }
  public getBinancePrice(
    val: OrderRow,
    robotPairInfo: RobotPairInfoDB,
    exchange: { [key: number]: ExchangeName }
  ): string {
    try {
      let token0Symbol: string;
      let token1Symbol: string;
      let token0ValueOrder = '0';
      let token1ValueOrder = '0';
      if (exchange[val.strategy.mainExchangeId] === ExchangeName.Binance) {
        const mainExchangeOrderInfo =
          val.mainExchangeOrderInfo as BinanceOrderInfoDB;
        token0ValueOrder = mainExchangeOrderInfo.executedQty;
        token1ValueOrder = mainExchangeOrderInfo.cummulativeQuoteQty;
        let price = '';
        if (
          new BigNumber(token0ValueOrder).gt(0) &&
          new BigNumber(token1ValueOrder).gt(0)
        ) {
          price = this.filterOrderVal(
            new BigNumber(token1ValueOrder).div(token0ValueOrder).toString(10)
          );
        } else if (new BigNumber(mainExchangeOrderInfo.price).gt(0)) {
          price = this.filterOrderVal(mainExchangeOrderInfo.price);
        }
        token0Symbol = this.getBinanceSymbol(
          mainExchangeOrderInfo.symbol,
          robotPairInfo
        ).base;
        token1Symbol = this.getBinanceSymbol(
          mainExchangeOrderInfo.symbol,
          robotPairInfo
        ).quote;
        return `1 ${token0Symbol} = ${price} ${token1Symbol}`;
      }
      if (exchange[val.strategy.secondExchangeId] === ExchangeName.Binance) {
        const secondExchangeOrderId =
          val.strategy.secondExchangePair.split(',');
        if (secondExchangeOrderId[0] && !secondExchangeOrderId[1]) {
          val.secondExchangeOrderInfo.forEach((item) => {
            const info = item as BinanceOrderInfoDB;
            token0ValueOrder = new BigNumber(info.executedQty)
              .plus(token0ValueOrder)
              .toString(10);
            token1ValueOrder = new BigNumber(info.cummulativeQuoteQty)
              .plus(token1ValueOrder)
              .toString(10);
          });
          const pairInfo = robotPairInfo[
            secondExchangeOrderId[0]
          ] as BinanceSymbol;
          token0Symbol = this.getBinanceSymbol(
            pairInfo.symbol,
            robotPairInfo
          ).base;
          token1Symbol = this.getBinanceSymbol(
            pairInfo.symbol,
            robotPairInfo
          ).quote;
        } else if (secondExchangeOrderId[0] && secondExchangeOrderId[1]) {
          val.secondExchangeOrderInfo.forEach((item) => {
            const info = item as BinanceOrderInfoDB;
            if (info.symbol === secondExchangeOrderId[0]) {
              token0ValueOrder = new BigNumber(info.executedQty)
                .plus(token0ValueOrder)
                .toString(10);
            }
            if (info.symbol === secondExchangeOrderId[1]) {
              token1ValueOrder = new BigNumber(info.executedQty)
                .plus(token1ValueOrder)
                .toString(10);
            }
          });
          const pairInfo = robotPairInfo[
            secondExchangeOrderId[0]
          ] as BinanceSymbol;
          const pairInfoTwo = robotPairInfo[
            secondExchangeOrderId[1]
          ] as BinanceSymbol;
          token0Symbol = this.getBinanceSymbol(
            pairInfo.symbol,
            robotPairInfo
          ).base;
          token1Symbol = this.getBinanceSymbol(
            pairInfoTwo.symbol,
            robotPairInfo
          ).base;
        }
        if (val.strategy.invert) {
          const price = this.filterOrderVal(
            new BigNumber(token0ValueOrder).div(token1ValueOrder).toString(10)
          );
          return `1 ${token1Symbol} = ${price} ${token0Symbol}`;
        } else {
          const price = this.filterOrderVal(
            new BigNumber(token1ValueOrder).div(token0ValueOrder).toString(10)
          );
          return `1 ${token0Symbol} = ${price} ${token1Symbol}`;
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getICDexPrice(
    val: OrderRow,
    robotPairInfo: RobotPairInfoDB,
    exchange: { [key: number]: ExchangeName }
  ): string {
    try {
      if (val) {
        if (exchange[val.strategy.mainExchangeId] === ExchangeName.ICDex) {
          const ICDexInfo = val.mainExchangeOrderInfo as ICDexOrderInfoDB;
          const pairInfo = robotPairInfo[ICDexInfo.pairId] as RobotICDexInfo;
          const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
          const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
          const token0decimals = token0Info.decimals;
          const token0Symbol = token0Info.symbol;
          const token1decimals = token1Info.decimals;
          const token1Symbol = token1Info.symbol;
          const res = this.getICDexToken0ValueOrder(ICDexInfo, pairInfo);
          if (res && res.price) {
            return `1 ${token0Symbol} = ${res.price} ${token1Symbol}`;
          } else if (res && res.token0ValueOrder && res.token1ValueOrder) {
            const price = this.filterOrderVal(
              new BigNumber(res.token1ValueOrder)
                .div(10 ** token1decimals)
                .times(10 ** token0decimals)
                .div(res.token0ValueOrder)
                .toString(10)
            );
            return `1 ${token0Symbol} = ${price} ${token1Symbol}`;
          }
        }
        if (exchange[val.strategy.secondExchangeId] === ExchangeName.ICDex) {
          let token0Symbol: string;
          let token1Symbol: string;
          let token0ValueOrder = '0';
          let token1ValueOrder = '0';
          const secondExchangeOrderId =
            val.strategy.secondExchangePair.split(',');
          if (secondExchangeOrderId[0] && !secondExchangeOrderId[1]) {
            val.secondExchangeOrderInfo.forEach((item) => {
              const info = item as ICDexOrderInfoDB;
              const pairInfo = robotPairInfo[info.pairId] as RobotICDexInfo;
              const res = this.getICDexToken0ValueOrder(info, pairInfo);
              if (res && res.token0ValueOrder && res.token1ValueOrder) {
                token0ValueOrder = new BigNumber(res.token0ValueOrder)
                  .plus(token0ValueOrder)
                  .toString(10);
                token1ValueOrder = new BigNumber(res.token1ValueOrder)
                  .plus(token1ValueOrder)
                  .toString(10);
              }
            });
            const pairInfo = robotPairInfo[
              secondExchangeOrderId[0]
            ] as RobotICDexInfo;
            const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
            const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
            token0Symbol = token0Info.symbol;
            token1Symbol = token1Info.symbol;
          } else if (secondExchangeOrderId[0] && secondExchangeOrderId[1]) {
            val.secondExchangeOrderInfo.forEach((item) => {
              const info = item as ICDexOrderInfoDB;
              const pairInfo = robotPairInfo[info.pairId] as RobotICDexInfo;
              const res = this.getICDexToken0ValueOrder(info, pairInfo);
              if (res.token0ValueOrder) {
                if (info.pairId === secondExchangeOrderId[0]) {
                  token0ValueOrder = new BigNumber(res.token0ValueOrder)
                    .plus(token0ValueOrder)
                    .toString(10);
                }
                if (info.pairId === secondExchangeOrderId[1]) {
                  token1ValueOrder = new BigNumber(res.token0ValueOrder)
                    .plus(token1ValueOrder)
                    .toString(10);
                }
              }
            });
            const pairInfo = robotPairInfo[
              secondExchangeOrderId[0]
            ] as RobotICDexInfo;
            const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
            const pairInfoTwo = robotPairInfo[
              secondExchangeOrderId[1]
            ] as RobotICDexInfo;
            const token0InfoTwo = JSON.parse(
              pairInfoTwo.token0Info
            ) as TokenInfo;
            token0Symbol = token0Info.symbol;
            token1Symbol = token0InfoTwo.symbol;
          }
          if (val.strategy.invert) {
            const price = this.filterOrderVal(
              new BigNumber(token0ValueOrder).div(token1ValueOrder).toString(10)
            );
            return `1 ${token1Symbol} = ${price} ${token0Symbol}`;
          } else {
            const price = this.filterOrderVal(
              new BigNumber(token1ValueOrder).div(token0ValueOrder).toString(10)
            );
            return `1 ${token0Symbol} = ${price} ${token1Symbol}`;
          }
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getICDexToken0ValueOrder(
    ICDexInfo: ICDexOrderInfoDB,
    pairInfo: RobotICDexInfo
  ): {
    token0ValueOrder: string;
    token1ValueOrder: string;
    price: string;
  } {
    const side = this.filterSide(ICDexInfo, ExchangeName.ICDex);
    let token0ValueOrder = '0';
    let token1ValueOrder = '0';
    if (ICDexInfo.status === 'Completed') {
      const filled = JSON.parse(ICDexInfo.filled) as ICDexCompletedFilled;
      const order = JSON.parse(ICDexInfo.origOrder) as ICDexOrder;
      if (
        !filled.token1Value.CreditRecord &&
        order.token0Value.length &&
        order.token1Value.length
      ) {
        if (side === 'Buy') {
          token0ValueOrder = order.token0Value[0].CreditRecord.toString(10);
          token1ValueOrder = order.token1Value[0].DebitRecord.toString(10);
        } else {
          token0ValueOrder = order.token0Value[0].DebitRecord.toString(10);
          token1ValueOrder = order.token1Value[0].CreditRecord.toString(10);
        }
      } else {
        if (side === 'Buy') {
          token0ValueOrder = filled.token0Value.CreditRecord.toString(10);
          token1ValueOrder = filled.token1Value.DebitRecord.toString(10);
        } else {
          token0ValueOrder = filled.token0Value.DebitRecord.toString(10);
          token1ValueOrder = filled.token1Value.CreditRecord.toString(10);
        }
      }
    } else {
      const filled = JSON.parse(ICDexInfo.filled) as Array<ICDexPendingFilled>;
      const orderPrice = JSON.parse(ICDexInfo.orderPrice) as OrderPrice;
      if (ICDexInfo.status === 'Pending' && !filled.length) {
        const price = this.filterOrderVal(
          new BigNumber(this.getPendingPrice(orderPrice, pairInfo)).toString(10)
        );
        return {
          token0ValueOrder: token0ValueOrder,
          token1ValueOrder: token1ValueOrder,
          price: price
        };
      }
      if (side === 'Buy') {
        filled.forEach((item) => {
          token0ValueOrder = new BigNumber(
            item.token0Value.CreditRecord.toString(10)
          )
            .plus(token0ValueOrder)
            .toString(10);
        });
        filled.forEach((item) => {
          token1ValueOrder = new BigNumber(
            item.token1Value.DebitRecord.toString(10)
          )
            .plus(token1ValueOrder)
            .toString(10);
        });
      } else {
        filled.forEach((item) => {
          token0ValueOrder = new BigNumber(
            item.token0Value.DebitRecord.toString(10)
          )
            .plus(token0ValueOrder)
            .toString(10);
        });
        filled.forEach((item) => {
          token1ValueOrder = new BigNumber(
            item.token1Value.CreditRecord.toString(10)
          )
            .plus(token1ValueOrder)
            .toString(10);
        });
      }
    }
    return {
      token0ValueOrder: token0ValueOrder,
      token1ValueOrder: token1ValueOrder,
      price: ''
    };
  }
  public getBuyToken0Binance(
    val: OrderInfoDB,
    balanceChangesFilled: FilledBalance
  ): string {
    try {
      if (val) {
        const binanceOrderInfo = val as BinanceOrderInfoDB;
        if (balanceChangesFilled && balanceChangesFilled.token0) {
          return balanceChangesFilled.token0.toString(10);
        } else {
          if (balanceChangesFilled && balanceChangesFilled.token1) {
            let token0 = '0';
            let token1 = '0';
            if (binanceOrderInfo.fills) {
              const fills =
                (JSON.parse(binanceOrderInfo.fills) as Array<Fills>) || [];
              for (let i = 0; i < fills.length; i++) {
                const detailToken1 = new BigNumber(fills[i].qty)
                  .times(fills[i].price)
                  .toString(10);
                if (new BigNumber(balanceChangesFilled.token1).gt(token1)) {
                  token0 = new BigNumber(fills[i].qty)
                    .plus(token0)
                    .toString(10);
                  token1 = new BigNumber(detailToken1)
                    .plus(token1)
                    .toString(10);
                } else {
                  token0 = new BigNumber(balanceChangesFilled.token1)
                    .minus(token1)
                    .div(detailToken1)
                    .times(fills[i].qty)
                    .plus(token0)
                    .toString(10);
                }
              }
            }
            return token0;
          } else {
            if (binanceOrderInfo.status !== 'FILLED') {
              return new BigNumber(binanceOrderInfo.origQty).toString(10);
            } else {
              return new BigNumber(binanceOrderInfo.executedQty).toString(10);
            }
          }
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getBuyToken0(
    val: OrderInfoDB,
    balanceChangesFilled: FilledBalance,
    robotPairInfo: RobotPairInfoDB
  ): string {
    try {
      if (val) {
        const ICDexInfo = val as ICDexOrderInfoDB;
        if (balanceChangesFilled && balanceChangesFilled.token0) {
          return balanceChangesFilled.token0.toString(10);
        } else {
          const pairInfo = robotPairInfo[ICDexInfo.pairId] as RobotICDexInfo;
          const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
          const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
          const token0Decimals = token0Info.decimals;
          const token1Decimals = token1Info.decimals;
          if (ICDexInfo.status === 'Completed') {
            const filled = JSON.parse(ICDexInfo.filled) as ICDexCompletedFilled;
            const order = JSON.parse(ICDexInfo.origOrder) as ICDexOrder;
            if (!filled.token0Value.CreditRecord && order.token0Value.length) {
              return new BigNumber(
                order.token0Value[0].CreditRecord.toString(10)
              )
                .div(10 ** token0Decimals)
                .toString(10);
            }
            if (balanceChangesFilled && balanceChangesFilled.token1) {
              let token0 = '0';
              let token1 = '0';
              const details = JSON.parse(ICDexInfo.details) as
                | Array<ICDexPendingFilled>
                | [];
              for (let i = 0; i < details.length; i++) {
                const value = details[i];
                const detailToken0 = new BigNumber(
                  value.token0Value.CreditRecord.toString(10)
                )
                  .div(10 ** token0Decimals)
                  .toString(10);
                const detailToken1 = new BigNumber(
                  value.token1Value.DebitRecord.toString(10)
                )
                  .div(10 ** token1Decimals)
                  .toString(10);
                if (new BigNumber(balanceChangesFilled.token1).gt(token1)) {
                  token0 = new BigNumber(detailToken0)
                    .plus(token0)
                    .toString(10);
                  token1 = new BigNumber(detailToken1)
                    .plus(token1)
                    .toString(10);
                } else {
                  token0 = new BigNumber(balanceChangesFilled.token1)
                    .minus(token1)
                    .div(detailToken1)
                    .times(detailToken0)
                    .plus(token0)
                    .toString(10);
                }
              }
              return token0;
            } else {
              return new BigNumber(filled.token0Value.CreditRecord.toString(10))
                .div(10 ** token0Decimals)
                .toString(10);
            }
          } else {
            const filled = JSON.parse(
              ICDexInfo.filled
            ) as Array<ICDexPendingFilled>;
            if (balanceChangesFilled && balanceChangesFilled.token1) {
              let token0 = '0';
              let token1 = '0';
              for (let i = 0; i < filled.length; i++) {
                const value = filled[i];
                const detailToken0 = new BigNumber(
                  value.token0Value.CreditRecord.toString(10)
                )
                  .div(10 ** token0Decimals)
                  .toString(10);
                const detailToken1 = new BigNumber(
                  value.token1Value.DebitRecord.toString(10)
                )
                  .div(10 ** token1Decimals)
                  .toString(10);
                if (new BigNumber(balanceChangesFilled.token1).gt(token1)) {
                  token0 = new BigNumber(detailToken0)
                    .plus(token0)
                    .toString(10);
                  token1 = new BigNumber(detailToken1)
                    .plus(token1)
                    .toString(10);
                } else {
                  token0 = new BigNumber(balanceChangesFilled.token1)
                    .minus(token1)
                    .div(detailToken1)
                    .times(detailToken0)
                    .plus(token0)
                    .toString(10);
                }
              }
              return token0;
            } else {
              let token0CreditRecord = '0';
              filled.forEach((item) => {
                token0CreditRecord = new BigNumber(
                  item.token0Value.CreditRecord.toString(10)
                )
                  .div(10 ** token0Decimals)
                  .plus(token0CreditRecord)
                  .toString(10);
              });
              if (val.status === 'Pending' && !filled.length) {
                const orderPrice = JSON.parse(
                  ICDexInfo.orderPrice
                ) as OrderPrice;
                return this.getPendingToken0(orderPrice, token0Decimals);
              } else {
                return token0CreditRecord;
              }
            }
          }
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getBuyToken1Binance(
    val: OrderInfoDB,
    balanceChangesFilled: FilledBalance
  ): string {
    try {
      if (val) {
        const binanceOrderInfo = val as BinanceOrderInfoDB;
        if (balanceChangesFilled && balanceChangesFilled.token0) {
          let token0 = '0';
          let token1 = '0';
          if (binanceOrderInfo.fills) {
            const fills =
              (JSON.parse(binanceOrderInfo.fills) as Array<Fills>) || [];
            for (let i = 0; i < fills.length; i++) {
              const detailToken1 = new BigNumber(fills[i].qty)
                .times(fills[i].price)
                .toString(10);
              if (new BigNumber(balanceChangesFilled.token0).gt(token0)) {
                token0 = new BigNumber(fills[i].qty).plus(token0).toString(10);
                token1 = new BigNumber(detailToken1).plus(token1).toString(10);
              } else {
                token1 = new BigNumber(balanceChangesFilled.token0)
                  .minus(token0)
                  .div(fills[i].qty)
                  .times(detailToken1)
                  .plus(token1)
                  .toString(10);
              }
            }
          }
          return token1;
        } else {
          if (binanceOrderInfo.status !== 'FILLED') {
            return new BigNumber(binanceOrderInfo.origQty)
              .times(binanceOrderInfo.price)
              .toString(10);
          } else {
            return binanceOrderInfo.cummulativeQuoteQty;
          }
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getBuyToken1(
    val: OrderInfoDB,
    balanceChangesFilled: FilledBalance,
    robotPairInfo: RobotPairInfoDB
  ): string {
    try {
      if (val) {
        const ICDexInfo = val as ICDexOrderInfoDB;
        const pairInfo = robotPairInfo[ICDexInfo.pairId] as RobotICDexInfo;
        const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
        const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
        const token0Decimals = token0Info.decimals;
        const token1Decimals = token1Info.decimals;
        if (ICDexInfo.status === 'Completed') {
          const filled = JSON.parse(ICDexInfo.filled) as ICDexCompletedFilled;
          const order = JSON.parse(ICDexInfo.origOrder) as ICDexOrder;
          if (!filled.token1Value.DebitRecord && order.token1Value.length) {
            return new BigNumber(order.token1Value[0].DebitRecord.toString(10))
              .div(10 ** token1Decimals)
              .toString(10);
          }
          if (balanceChangesFilled && balanceChangesFilled.token0) {
            let token1 = '0';
            let token0 = '0';
            const details = JSON.parse(ICDexInfo.details) as
              | Array<ICDexPendingFilled>
              | [];
            for (let i = 0; i < details.length; i++) {
              const value = details[i];
              const detailToken0 = new BigNumber(
                value.token0Value.CreditRecord.toString(10)
              )
                .div(10 ** token0Decimals)
                .toString(10);
              const detailToken1 = new BigNumber(
                value.token1Value.DebitRecord.toString(10)
              )
                .div(10 ** token1Decimals)
                .toString(10);
              if (new BigNumber(balanceChangesFilled.token0).gt(token0)) {
                token0 = new BigNumber(detailToken0).plus(token0).toString(10);
                token1 = new BigNumber(detailToken1).plus(token1).toString(10);
              } else {
                token1 = new BigNumber(balanceChangesFilled.token0)
                  .minus(token0)
                  .div(detailToken0)
                  .times(detailToken1)
                  .plus(token1)
                  .toString(10);
              }
            }
            return token1;
          } else {
            return new BigNumber(filled.token1Value.DebitRecord.toString(10))
              .div(10 ** token1Decimals)
              .toString(10);
          }
        } else {
          const filled = JSON.parse(
            ICDexInfo.filled
          ) as Array<ICDexPendingFilled>;
          if (balanceChangesFilled && balanceChangesFilled.token0) {
            let token1 = '0';
            let token0 = '0';
            for (let i = 0; i < filled.length; i++) {
              const value = filled[i];
              const detailToken0 = new BigNumber(
                value.token0Value.CreditRecord.toString(10)
              )
                .div(10 ** token0Decimals)
                .toString(10);
              const detailToken1 = new BigNumber(
                value.token1Value.DebitRecord.toString(10)
              )
                .div(10 ** token1Decimals)
                .toString(10);
              if (new BigNumber(balanceChangesFilled.token0).gt(token0)) {
                token0 = new BigNumber(detailToken0).plus(token0).toString(10);
                token1 = new BigNumber(detailToken1).plus(token1).toString(10);
              } else {
                token1 = new BigNumber(balanceChangesFilled.token0)
                  .minus(token0)
                  .div(detailToken0)
                  .times(detailToken1)
                  .plus(token1)
                  .toString(10);
              }
            }
            return token1;
          } else {
            let token1DebitRecord = '0';
            filled.forEach((item) => {
              token1DebitRecord = new BigNumber(
                item.token1Value.DebitRecord.toString(10)
              )
                .div(10 ** token1Decimals)
                .plus(token1DebitRecord)
                .toString(10);
            });
            if (val.status === 'Pending' && !filled.length) {
              const orderPrice = JSON.parse(ICDexInfo.orderPrice) as OrderPrice;
              return this.getPendingToken1Total(
                orderPrice,
                pairInfo,
                token0Decimals
              );
            } else {
              return token1DebitRecord;
            }
          }
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getSellToken1Binance(
    val: OrderInfoDB,
    balanceChangesFilled: FilledBalance
  ): string {
    try {
      if (val) {
        const binanceOrderInfo = val as BinanceOrderInfoDB;
        if (balanceChangesFilled && balanceChangesFilled.token1) {
          return balanceChangesFilled.token1.toString(10);
        } else {
          if (balanceChangesFilled && balanceChangesFilled.token0) {
            let token1 = '0';
            let token0 = '0';
            if (binanceOrderInfo.fills) {
              const fills =
                (JSON.parse(binanceOrderInfo.fills) as Array<Fills>) || [];
              for (let i = 0; i < fills.length; i++) {
                const detailToken1 = new BigNumber(fills[i].qty)
                  .times(fills[i].price)
                  .toString(10);
                if (new BigNumber(balanceChangesFilled.token0).gt(token0)) {
                  token0 = new BigNumber(fills[i].qty)
                    .plus(token0)
                    .toString(10);
                  token1 = new BigNumber(detailToken1)
                    .plus(token1)
                    .toString(10);
                } else {
                  token1 = new BigNumber(balanceChangesFilled.token0)
                    .minus(token0)
                    .div(fills[i].qty)
                    .times(detailToken1)
                    .plus(token1)
                    .toString(10);
                }
              }
            }
            return token1;
          } else {
            if (binanceOrderInfo.status !== 'FILLED') {
              return new BigNumber(binanceOrderInfo.origQty)
                .times(binanceOrderInfo.price)
                .toString(10);
            } else {
              return binanceOrderInfo.cummulativeQuoteQty;
            }
          }
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getSellToken1(
    val: OrderInfoDB,
    balanceChangesFilled: FilledBalance,
    robotPairInfo: RobotPairInfoDB
  ): string {
    try {
      if (val) {
        const ICDexInfo = val as ICDexOrderInfoDB;
        const pairInfo = robotPairInfo[ICDexInfo.pairId] as RobotICDexInfo;
        const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
        const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
        const token0Decimals = token0Info.decimals;
        const token1Decimals = token1Info.decimals;
        if (balanceChangesFilled && balanceChangesFilled.token1) {
          return balanceChangesFilled.token1.toString(10);
        } else {
          if (ICDexInfo.status === 'Completed') {
            const filled = JSON.parse(ICDexInfo.filled) as ICDexCompletedFilled;
            const order = JSON.parse(ICDexInfo.origOrder) as ICDexOrder;
            if (!filled.token1Value.CreditRecord && order.token1Value.length) {
              return new BigNumber(
                order.token1Value[0].CreditRecord.toString(10)
              )
                .div(10 ** token1Decimals)
                .toString(10);
            }
            if (balanceChangesFilled && balanceChangesFilled.token0) {
              let token1 = '0';
              let token0 = '0';
              const details = JSON.parse(ICDexInfo.details) as
                | Array<ICDexPendingFilled>
                | [];
              for (let i = 0; i < details.length; i++) {
                const value = details[i];
                const detailToken0 = new BigNumber(
                  value.token0Value.DebitRecord.toString(10)
                )
                  .div(10 ** token0Decimals)
                  .toString(10);
                const detailToken1 = new BigNumber(
                  value.token1Value.CreditRecord.toString(10)
                )
                  .div(10 ** token1Decimals)
                  .toString(10);
                if (new BigNumber(balanceChangesFilled.token0).gt(token0)) {
                  token0 = new BigNumber(detailToken0)
                    .plus(token0)
                    .toString(10);
                  token1 = new BigNumber(detailToken1)
                    .plus(token1)
                    .toString(10);
                } else {
                  token1 = new BigNumber(balanceChangesFilled.token0)
                    .minus(token0)
                    .div(detailToken0)
                    .times(detailToken1)
                    .plus(token1)
                    .toString(10);
                }
              }
              return token1;
            } else {
              return new BigNumber(filled.token1Value.CreditRecord.toString(10))
                .div(10 ** token1Decimals)
                .toString(10);
            }
          } else {
            const filled = JSON.parse(
              ICDexInfo.filled
            ) as Array<ICDexPendingFilled>;
            if (balanceChangesFilled && balanceChangesFilled.token0) {
              let token1 = '0';
              let token0 = '0';
              for (let i = 0; i < filled.length; i++) {
                const value = filled[i];
                const detailToken0 = new BigNumber(
                  value.token0Value.DebitRecord.toString(10)
                )
                  .div(10 ** token0Decimals)
                  .toString(10);
                const detailToken1 = new BigNumber(
                  value.token1Value.CreditRecord.toString(10)
                )
                  .div(10 ** token1Decimals)
                  .toString(10);
                if (new BigNumber(balanceChangesFilled.token0).gt(token0)) {
                  token0 = new BigNumber(detailToken0)
                    .plus(token0)
                    .toString(10);
                  token1 = new BigNumber(detailToken1)
                    .plus(token1)
                    .toString(10);
                } else {
                  token1 = new BigNumber(balanceChangesFilled.token0)
                    .minus(token0)
                    .div(detailToken0)
                    .times(detailToken1)
                    .plus(token1)
                    .toString(10);
                }
              }
              return token1;
            } else {
              let token1CreditRecord = '0';
              filled.forEach((item) => {
                token1CreditRecord = new BigNumber(
                  item.token1Value.CreditRecord.toString(10)
                )
                  .div(10 ** token1Decimals)
                  .plus(token1CreditRecord)
                  .toString(10);
              });
              if (val.status === 'Pending' && !filled.length) {
                const orderPrice = JSON.parse(
                  ICDexInfo.orderPrice
                ) as OrderPrice;
                return this.getPendingToken1Total(
                  orderPrice,
                  pairInfo,
                  token0Decimals
                );
              } else {
                return token1CreditRecord;
              }
            }
          }
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getSellToken0Binance(
    val: OrderInfoDB,
    balanceChangesFilled: FilledBalance
  ): string {
    try {
      if (val) {
        const binanceOrderInfo = val as BinanceOrderInfoDB;
        if (balanceChangesFilled && balanceChangesFilled.token1) {
          let token0 = '0';
          let token1 = '0';
          if (binanceOrderInfo.fills) {
            const fills =
              (JSON.parse(binanceOrderInfo.fills) as Array<Fills>) || [];
            for (let i = 0; i < fills.length; i++) {
              const detailToken1 = new BigNumber(fills[i].qty)
                .times(fills[i].price)
                .toString(10);
              if (new BigNumber(balanceChangesFilled.token1).gt(token1)) {
                token0 = new BigNumber(fills[i].qty).plus(token0).toString(10);
                token1 = new BigNumber(detailToken1).plus(token1).toString(10);
              } else {
                token0 = new BigNumber(balanceChangesFilled.token1)
                  .minus(token1)
                  .div(detailToken1)
                  .times(fills[i].qty)
                  .plus(token0)
                  .toString(10);
              }
            }
          }
          return token0;
        } else {
          if (binanceOrderInfo.status !== 'FILLED') {
            return new BigNumber(binanceOrderInfo.origQty).toString(10);
          } else {
            return new BigNumber(binanceOrderInfo.executedQty).toString(10);
          }
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getSellToken0(
    val: OrderInfoDB,
    balanceChangesFilled: FilledBalance,
    robotPairInfo: RobotPairInfoDB
  ): string {
    try {
      if (val) {
        const ICDexInfo = val as ICDexOrderInfoDB;
        const pairInfo = robotPairInfo[ICDexInfo.pairId] as RobotICDexInfo;
        const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
        const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
        const token0Decimals = token0Info.decimals;
        const token1Decimals = token1Info.decimals;
        if (ICDexInfo.status === 'Completed') {
          const filled = JSON.parse(ICDexInfo.filled) as ICDexCompletedFilled;
          const order = JSON.parse(ICDexInfo.origOrder) as ICDexOrder;
          if (!filled.token0Value.DebitRecord && order.token0Value.length) {
            return new BigNumber(order.token0Value[0].DebitRecord.toString(10))
              .div(10 ** token0Decimals)
              .toString(10);
          }
          if (balanceChangesFilled && balanceChangesFilled.token1) {
            let token0 = '0';
            let token1 = '0';
            const details = JSON.parse(ICDexInfo.details) as
              | Array<ICDexPendingFilled>
              | [];
            for (let i = 0; i < details.length; i++) {
              const value = details[i];
              const detailToken0 = new BigNumber(
                value.token0Value.DebitRecord.toString(10)
              )
                .div(10 ** token0Decimals)
                .toString(10);
              const detailToken1 = new BigNumber(
                value.token1Value.CreditRecord.toString(10)
              )
                .div(10 ** token1Decimals)
                .toString(10);
              if (new BigNumber(balanceChangesFilled.token1).gt(token1)) {
                token0 = new BigNumber(detailToken0).plus(token0).toString(10);
                token1 = new BigNumber(detailToken1).plus(token1).toString(10);
              } else {
                token0 = new BigNumber(balanceChangesFilled.token1)
                  .minus(token1)
                  .div(detailToken1)
                  .times(detailToken0)
                  .plus(token0)
                  .toString(10);
              }
            }
            return token0;
          } else {
            return new BigNumber(filled.token0Value.DebitRecord.toString(10))
              .div(10 ** token0Decimals)
              .toString(10);
          }
        } else {
          const filled = JSON.parse(
            ICDexInfo.filled
          ) as Array<ICDexPendingFilled>;
          if (balanceChangesFilled && balanceChangesFilled.token1) {
            let token0 = '0';
            let token1 = '0';
            for (let i = 0; i < filled.length; i++) {
              const value = filled[i];
              const detailToken0 = new BigNumber(
                value.token0Value.DebitRecord.toString(10)
              )
                .div(10 ** token0Decimals)
                .toString(10);
              const detailToken1 = new BigNumber(
                value.token1Value.CreditRecord.toString(10)
              )
                .div(10 ** token1Decimals)
                .toString(10);
              if (new BigNumber(balanceChangesFilled.token1).gt(token1)) {
                token0 = new BigNumber(detailToken0).plus(token0).toString(10);
                token1 = new BigNumber(detailToken1).plus(token1).toString(10);
              } else {
                token0 = new BigNumber(balanceChangesFilled.token1)
                  .minus(token1)
                  .div(detailToken1)
                  .times(detailToken0)
                  .plus(token0)
                  .toString(10);
              }
            }
            return token0;
          } else {
            let token0CreditRecord = '0';
            filled.forEach((item) => {
              token0CreditRecord = new BigNumber(
                item.token0Value.DebitRecord.toString(10)
              )
                .div(10 ** token0Decimals)
                .plus(token0CreditRecord)
                .toString(10);
            });
            if (val.status === 'Pending' && !filled.length) {
              const orderPrice = JSON.parse(ICDexInfo.orderPrice) as OrderPrice;
              return this.getPendingToken0(orderPrice, token0Decimals);
            } else {
              return token0CreditRecord;
            }
          }
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public getPendingToken0(
    orderPrice: OrderPrice,
    token0Decimals: number
  ): string {
    const quantity = orderPrice.quantity;
    let amount: bigint;
    if (
      (
        quantity as {
          Buy: [bigint, bigint];
        }
      ).Buy
    ) {
      amount = (
        quantity as {
          Buy: [bigint, bigint];
        }
      ).Buy[0];
    } else {
      amount = (quantity as { Sell: bigint }).Sell;
    }
    return new BigNumber(amount.toString(10))
      .div(10 ** token0Decimals)
      .toString(10);
  }
  public getPendingToken1Total(
    orderPrice: OrderPrice,
    robotPairInfo: RobotICDexInfo,
    token0Decimals: number
  ): string {
    const token0 = this.getPendingToken0(orderPrice, token0Decimals);
    const price = this.getPendingPrice(orderPrice, robotPairInfo);
    return new BigNumber(token0).times(price).toString(10);
  }
  public getPendingPrice(
    orderPrice: OrderPrice,
    robotPairInfo: RobotICDexInfo
  ): string {
    const token0Info = JSON.parse(robotPairInfo.token0Info) as TokenInfo;
    const token1Info = JSON.parse(robotPairInfo.token1Info) as TokenInfo;
    const token0Decimals = token0Info.decimals;
    const token1Decimals = token1Info.decimals;
    const setting = JSON.parse(robotPairInfo.setting) as DexSetting;
    return new BigNumber(orderPrice.price.toString(10))
      .div(10 ** token1Decimals)
      .div(new BigNumber(setting.UNIT_SIZE).div(10 ** token0Decimals))
      .toString(10);
  }
  public filterSide(val: OrderInfoDB, exchangeName: ExchangeName): string {
    if (exchangeName === ExchangeName.ICDex) {
      val = val as ICDexOrderInfoDB;
      if (val.status === 'None') {
        return 'Failed';
      } else if (val.status === 'Completed') {
        const order = JSON.parse(val.origOrder) as ICDexOrder;
        if (order && order.token0Value && order.token0Value.length) {
          const orderType = Object.keys(order.token0Value[0])[0];
          if (orderType === 'DebitRecord') {
            return 'Sell';
          } else {
            return 'Buy';
          }
        } else if (order && order.token1Value && order.token1Value.length) {
          const orderType = Object.keys(order.token1Value[0])[0];
          if (orderType === 'DebitRecord') {
            return 'Buy';
          } else {
            return 'Sell';
          }
        }
      } else {
        const orderPrice = JSON.parse(val.orderPrice) as OrderPrice;
        if (orderPrice && orderPrice.quantity) {
          const quantity = orderPrice.quantity;
          if (
            (
              quantity as {
                Buy: [bigint, bigint];
              }
            ).Buy
          ) {
            return 'Buy';
          } else {
            return 'Sell';
          }
        }
      }
    } else if (exchangeName === ExchangeName.Binance) {
      val = val as BinanceOrderInfoDB;
      if (val.side === 'BUY') {
        return 'Buy';
      } else {
        return 'Sell';
      }
    }
  }
  public getEarnings(
    val: OrderRow,
    exchange: { [key: number]: ExchangeName },
    robotPairInfo: RobotPairInfoDB
  ): string {
    try {
      if (!val.secondExchangeOrderInfo.length) {
        return '-';
      }
      const side = this.filterSide(
        val.mainExchangeOrderInfo,
        exchange[val.strategy.mainExchangeId]
      );
      if (exchange[val.strategy.mainExchangeId] === ExchangeName.ICDex) {
        const ICDexPairInfo = robotPairInfo[
          val.strategy.mainExchangePair
        ] as RobotICDexInfo;
        const token0Info = JSON.parse(ICDexPairInfo.token0Info) as TokenInfo;
        const token1Info = JSON.parse(ICDexPairInfo.token1Info) as TokenInfo;
        if (side === 'Buy') {
          const token1DebitRecord = this.getBuyToken1(
            val.mainExchangeOrderInfo,
            val.balanceChangesFilled,
            robotPairInfo
          );
          let token1CreditRecord = '0';
          if (
            exchange[val.strategy.secondExchangeId] === ExchangeName.Binance
          ) {
            if (val.strategy.invert === 0) {
              const secondExchangeOrderId =
                val.strategy.secondExchangePair.split(',');
              if (
                secondExchangeOrderId &&
                secondExchangeOrderId.length &&
                !secondExchangeOrderId[1]
              ) {
                val.secondExchangeOrderInfo.forEach((item) => {
                  const info = item as BinanceOrderInfoDB;
                  if (info.symbol === secondExchangeOrderId[0]) {
                    token1CreditRecord = new BigNumber(info.cummulativeQuoteQty)
                      .plus(token1CreditRecord)
                      .toString(10);
                  }
                });
              } else if (
                secondExchangeOrderId &&
                secondExchangeOrderId.length &&
                secondExchangeOrderId[1]
              ) {
                val.secondExchangeOrderInfo.forEach((item) => {
                  const info = item as BinanceOrderInfoDB;
                  if (info.symbol === secondExchangeOrderId[1]) {
                    token1CreditRecord = new BigNumber(info.executedQty)
                      .plus(token1CreditRecord)
                      .toString(10);
                  }
                });
              }
            } else if (val.strategy.invert === 1) {
              val.secondExchangeOrderInfo.forEach((item) => {
                const info = item as BinanceOrderInfoDB;
                if (info.symbol === val.strategy.secondExchangePair) {
                  token1CreditRecord = new BigNumber(info.executedQty)
                    .plus(token1CreditRecord)
                    .toString(10);
                }
              });
            }
          }
          return (
            this.filterOrderVal(
              new BigNumber(token1CreditRecord)
                .minus(token1DebitRecord)
                .toString(10)
            ) +
            ' ' +
            token1Info.symbol
          );
        } else {
          const token0DebitRecord = this.getSellToken0(
            val.mainExchangeOrderInfo,
            val.balanceChangesFilled,
            robotPairInfo
          );
          let token0CreditRecord = '0';
          if (
            exchange[val.strategy.secondExchangeId] === ExchangeName.Binance
          ) {
            const secondExchangeOrderId =
              val.strategy.secondExchangePair.split(',');
            if (val.strategy.invert === 0) {
              if (
                secondExchangeOrderId &&
                secondExchangeOrderId.length &&
                !secondExchangeOrderId[1]
              ) {
                val.secondExchangeOrderInfo.forEach((item) => {
                  const info = item as BinanceOrderInfoDB;
                  if (info.symbol === secondExchangeOrderId[0]) {
                    token0CreditRecord = new BigNumber(info.executedQty)
                      .plus(token0CreditRecord)
                      .toString(10);
                  }
                });
              } else if (
                secondExchangeOrderId &&
                secondExchangeOrderId.length &&
                secondExchangeOrderId[1]
              ) {
                val.secondExchangeOrderInfo.forEach((item) => {
                  const info = item as BinanceOrderInfoDB;
                  if (info.symbol === secondExchangeOrderId[1]) {
                    token0CreditRecord = new BigNumber(info.executedQty)
                      .plus(token0CreditRecord)
                      .toString(10);
                  }
                });
              }
            } else if (val.strategy.invert === 1) {
              val.secondExchangeOrderInfo.forEach((item) => {
                const info = item as BinanceOrderInfoDB;
                if (info.symbol === val.strategy.secondExchangePair) {
                  token0CreditRecord = new BigNumber(info.cummulativeQuoteQty)
                    .plus(token0CreditRecord)
                    .toString(10);
                }
              });
            }
          }
          return (
            this.filterOrderVal(
              new BigNumber(token0CreditRecord)
                .minus(token0DebitRecord)
                .toString(10)
            ) +
            ' ' +
            token0Info.symbol
          );
        }
      } else if (
        exchange[val.strategy.mainExchangeId] === ExchangeName.Binance
      ) {
        const orderInfo = val.mainExchangeOrderInfo as BinanceOrderInfoDB;
        const binancePairInfo = robotPairInfo[
          val.strategy.mainExchangePair
        ] as BinanceSymbol;
        if (orderInfo.side === 'BUY') {
          const token1DebitRecord = orderInfo.cummulativeQuoteQty;
          let token1CreditRecord = '0';
          if (exchange[val.strategy.secondExchangeId] === ExchangeName.ICDex) {
            if (val.strategy.invert === 0) {
              const secondExchangeOrderId =
                val.strategy.secondExchangePair.split(',');
              if (
                secondExchangeOrderId &&
                secondExchangeOrderId.length &&
                !secondExchangeOrderId[1]
              ) {
                val.secondExchangeOrderInfo.forEach((item) => {
                  const info = item as ICDexOrderInfoDB;
                  if (info.pairId === secondExchangeOrderId[0]) {
                    const res = this.getSellToken1(
                      info,
                      { token0: 0, token1: 0 },
                      robotPairInfo
                    );
                    token1CreditRecord = new BigNumber(res)
                      .plus(token1CreditRecord)
                      .toString(10);
                  }
                });
              } else if (
                secondExchangeOrderId &&
                secondExchangeOrderId.length &&
                secondExchangeOrderId[1]
              ) {
                val.secondExchangeOrderInfo.forEach((item) => {
                  const info = item as ICDexOrderInfoDB;
                  if (info.pairId === secondExchangeOrderId[1]) {
                    const res = this.getBuyToken0(
                      info,
                      { token0: 0, token1: 0 },
                      robotPairInfo
                    );
                    token1CreditRecord = new BigNumber(res)
                      .plus(token1CreditRecord)
                      .toString(10);
                  }
                });
              }
            } else if (val.strategy.invert === 1) {
              val.secondExchangeOrderInfo.forEach((item) => {
                const info = item as ICDexOrderInfoDB;
                if (info.pairId === val.strategy.secondExchangePair) {
                  const res = this.getBuyToken0(
                    info,
                    { token0: 0, token1: 0 },
                    robotPairInfo
                  );
                  token1CreditRecord = new BigNumber(res)
                    .plus(token1CreditRecord)
                    .toString(10);
                }
              });
            }
          }
          return (
            this.filterOrderVal(
              new BigNumber(token1CreditRecord)
                .minus(token1DebitRecord)
                .toString(10)
            ) +
            ' ' +
            binancePairInfo.quoteAsset
          );
        } else {
          const token0DebitRecord = orderInfo.executedQty;
          let token0CreditRecord = '0';
          if (exchange[val.strategy.secondExchangeId] === ExchangeName.ICDex) {
            const secondExchangeOrderId =
              val.strategy.secondExchangePair.split(',');
            if (val.strategy.invert === 0) {
              if (
                secondExchangeOrderId &&
                secondExchangeOrderId.length &&
                !secondExchangeOrderId[1]
              ) {
                val.secondExchangeOrderInfo.forEach((item) => {
                  const info = item as ICDexOrderInfoDB;
                  if (info.pairId === secondExchangeOrderId[0]) {
                    const res = this.getBuyToken0(
                      info,
                      { token0: 0, token1: 0 },
                      robotPairInfo
                    );
                    token0CreditRecord = new BigNumber(res)
                      .plus(token0CreditRecord)
                      .toString(10);
                  }
                });
              } else if (
                secondExchangeOrderId &&
                secondExchangeOrderId.length &&
                secondExchangeOrderId[1]
              ) {
                val.secondExchangeOrderInfo.forEach((item) => {
                  const info = item as ICDexOrderInfoDB;
                  if (info.pairId === secondExchangeOrderId[1]) {
                    const res = this.getBuyToken0(
                      info,
                      { token0: 0, token1: 0 },
                      robotPairInfo
                    );
                    token0CreditRecord = new BigNumber(res)
                      .plus(token0CreditRecord)
                      .toString(10);
                  }
                });
              }
            } else if (val.strategy.invert === 1) {
              val.secondExchangeOrderInfo.forEach((item) => {
                const info = item as ICDexOrderInfoDB;
                if (info.pairId === val.strategy.secondExchangePair) {
                  const res = this.getSellToken1(
                    info,
                    { token0: 0, token1: 0 },
                    robotPairInfo
                  );
                  token0CreditRecord = new BigNumber(res)
                    .plus(token0CreditRecord)
                    .toString(10);
                }
              });
            }
          }
          return (
            this.filterOrderVal(
              new BigNumber(token0CreditRecord)
                .minus(token0DebitRecord)
                .toString(10)
            ) +
            ' ' +
            binancePairInfo.baseAsset
          );
        }
      }
    } catch (e) {
      //
    }
    return '';
  }
  public filterOrderStatus(
    val: OrderRow,
    exchange: { [key: number]: ExchangeName }
  ): string {
    if (val && exchange) {
      if (exchange[val.strategy.mainExchangeId] === ExchangeName.ICDex) {
        if (val.mainExchangeOrderInfo) {
          const pairInfo = val.mainExchangeOrderInfo as ICDexOrderInfoDB;
          const filled = JSON.parse(pairInfo.filled);
          if (
            filled &&
            filled.length &&
            pairInfo.tradingStatus &&
            (pairInfo.tradingStatus === 'Cancelled' ||
              pairInfo.tradingStatus === 'Closed' ||
              pairInfo.tradingStatus === 'Completed')
          ) {
            return 'Completed';
          }
          if (
            pairInfo.tradingStatus &&
            pairInfo.tradingStatus === 'Cancelled'
          ) {
            return 'Cancelled';
          }
          return pairInfo.status;
        }
      } else if (
        exchange[val.strategy.mainExchangeId] === ExchangeName.Binance
      ) {
        const pairInfo = val.mainExchangeOrderInfo as BinanceOrderInfoDB;
        const pending = ['NEW', 'PENDING_NEW'];
        if (pending.includes(pairInfo.status)) {
          return 'Pending';
        }
        if (pairInfo.status === 'FILLED') {
          return 'Completed';
        }
        if (pairInfo.status === 'CANCELED') {
          if (Number(pairInfo.executedQty)) {
            return 'Completed';
          } else {
            return 'Cancelled';
          }
        }
        return 'Cancelled';
      }
    }
    return '';
  }
}
