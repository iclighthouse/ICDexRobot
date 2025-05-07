<template>
  <div class="base-font-title exchange-main">
    <div class="base-font-normal flex-center">
      <div class="dashboard-title">Robots</div>
      <div @click="showAddRobot" class="margin-left-auto pointer">+ Open</div>
    </div>
    <a-spin :spinning="spinningExchange" class="table-spinning">
      <table class="mt20">
        <thead>
          <tr>
            <th>Id</th>
            <th>Type</th>
            <th>Main exchange & Pair</th>
            <th>Balances</th>
            <th>Second exchange & Pair</th>
            <th>Balances</th>
            <th>Arguments</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr :key="item.id" v-for="(item, index) in robots">
            <td>
              {{ item.id }}
            </td>
            <td>
              {{ robotTypeName[item.typeId] }}
            </td>
            <td>
              <div>{{ exchange[item.mainExchangeId] }}</div>
              <div
                v-show="
                  robotPairInfo[item.mainExchangePair] &&
                  robotDepth[item.mainExchangePair]
                "
              >
                {{
                  robotPairInfo[item.mainExchangePair]
                    | filterPair(exchange[item.mainExchangeId])
                }}
                <a-tooltip placement="top">
                  <template slot="title">
                    <span class="token-price ask-price">
                      ask:
                      {{
                        robotDepth[item.mainExchangePair]
                          | filterDepth(
                            robotPairInfo[item.mainExchangePair],
                            exchange[item.mainExchangeId],
                            'ask',
                            token1Unit
                          )
                      }}
                    </span>
                    <span
                      style="margin-left: 5px"
                      class="token-price bid-price"
                    >
                      bid:
                      {{
                        robotDepth[item.mainExchangePair]
                          | filterDepth(
                            robotPairInfo[item.mainExchangePair],
                            exchange[item.mainExchangeId],
                            'bid',
                            token1Unit
                          )
                      }}
                    </span>
                  </template>
                  <span
                    v-if="robotStats[item.mainExchangePair]"
                    class="pointer"
                    :class="{
                      'base-red':
                        robotStats[item.mainExchangePair].latestPrice -
                          robotStats[item.mainExchangePair].lastPrice >
                        0,
                      'base-green':
                        robotStats[item.mainExchangePair].latestPrice -
                          robotStats[item.mainExchangePair].lastPrice <
                        0
                    }"
                  >
                    |
                    {{
                      robotStats[item.mainExchangePair].latestPrice
                        | filterPrice(
                          robotPairInfo[item.mainExchangePair],
                          exchange[item.mainExchangeId]
                        )
                        | filterVal
                    }}
                  </span>
                </a-tooltip>
              </div>
            </td>
            <td>
              <div
                v-if="
                  robotTypeName[item.typeId] === 'Timer Robot' &&
                  insufficientBalance(
                    robotTypeName[item.typeId],
                    item.arguments,
                    robotPairInfo[item.mainExchangePair],
                    robotBalance,
                    robotAccounts[item.mainExchangeAccountId],
                    exchange[item.mainExchangeId]
                  )
                "
              >
                <a-tooltip placement="top">
                  <template slot="title"> Insufficient balance </template>
                  <div class="base-red">
                    {{
                      filterBalance(
                        robotPairInfo[item.mainExchangePair],
                        robotBalance,
                        robotAccounts[item.mainExchangeAccountId],
                        exchange[item.mainExchangeId],
                        true
                      ) | filterVal
                    }}
                    {{
                      robotPairInfo[item.mainExchangePair]
                        | filterSymbol(exchange[item.mainExchangeId], true)
                    }}
                  </div>
                </a-tooltip>
              </div>
              <div v-else>
                {{
                  filterBalance(
                    robotPairInfo[item.mainExchangePair],
                    robotBalance,
                    robotAccounts[item.mainExchangeAccountId],
                    exchange[item.mainExchangeId],
                    true
                  ) | filterVal
                }}
                {{
                  robotPairInfo[item.mainExchangePair]
                    | filterSymbol(exchange[item.mainExchangeId], true)
                }}
              </div>
              <div
                v-if="
                  robotTypeName[item.typeId] === 'Maker Robot' &&
                  insufficientBalance(
                    robotTypeName[item.typeId],
                    item.arguments,
                    robotPairInfo[item.mainExchangePair],
                    robotBalance,
                    robotAccounts[item.mainExchangeAccountId],
                    exchange[item.mainExchangeId]
                  )
                "
              >
                <a-tooltip placement="top">
                  <template slot="title"> Insufficient balance </template>
                  <div class="base-red">
                    {{
                      filterBalance(
                        robotPairInfo[item.mainExchangePair],
                        robotBalance,
                        robotAccounts[item.mainExchangeAccountId],
                        exchange[item.mainExchangeId],
                        false
                      ) | filterVal
                    }}
                    {{
                      robotPairInfo[item.mainExchangePair]
                        | filterSymbol(exchange[item.mainExchangeId], false)
                    }}
                  </div>
                </a-tooltip>
              </div>
              <div v-else>
                {{
                  filterBalance(
                    robotPairInfo[item.mainExchangePair],
                    robotBalance,
                    robotAccounts[item.mainExchangeAccountId],
                    exchange[item.mainExchangeId],
                    false
                  ) | filterVal
                }}
                {{
                  robotPairInfo[item.mainExchangePair]
                    | filterSymbol(exchange[item.mainExchangeId], false)
                }}
              </div>
            </td>
            <td>
              <div
                v-if="
                  (robotTypeName[item.typeId] === 'Timer Robot' &&
                    getTimerConfig(item.arguments) &&
                    !getTimerConfig(item.arguments).unilateral) ||
                  robotTypeName[item.typeId] === 'Maker Robot'
                "
              >
                <div>{{ exchange[item.secondExchangeId] }}</div>
                <div
                  v-show="
                    robotPairInfo[item.secondExchangePair.split(',')[0]] &&
                    robotDepth[item.secondExchangePair.split(',')[0]]
                  "
                >
                  {{
                    robotPairInfo[item.secondExchangePair.split(',')[0]]
                      | filterPair(exchange[item.secondExchangeId])
                  }}
                  <a-tooltip placement="top">
                    <template slot="title">
                      <span class="token-price ask-price">
                        ask:
                        {{
                          robotDepth[item.secondExchangePair.split(',')[0]]
                            | filterDepth(
                              robotPairInfo[
                                [item.secondExchangePair.split(',')[0]]
                              ],
                              exchange[item.secondExchangeId],
                              'ask',
                              token1Unit
                            )
                        }}
                      </span>
                      <span
                        style="margin-left: 5px"
                        class="token-price bid-price"
                      >
                        bid:
                        {{
                          robotDepth[[item.secondExchangePair.split(',')[0]]]
                            | filterDepth(
                              robotPairInfo[
                                [item.secondExchangePair.split(',')[0]]
                              ],
                              exchange[item.secondExchangeId],
                              'bid',
                              token1Unit
                            )
                        }}
                      </span>
                    </template>
                    <span
                      v-if="robotStats[item.secondExchangePair.split(',')[0]]"
                      class="pointer"
                      :class="{
                        'base-red':
                          robotStats[item.secondExchangePair.split(',')[0]]
                            .latestPrice -
                            robotStats[item.secondExchangePair.split(',')[0]]
                              .lastPrice >
                          0,
                        'base-green':
                          robotStats[item.secondExchangePair.split(',')[0]]
                            .latestPrice -
                            robotStats[item.secondExchangePair.split(',')[0]]
                              .lastPrice <
                          0
                      }"
                    >
                      |
                      {{
                        robotStats[item.secondExchangePair.split(',')[0]]
                          .latestPrice | filterVal
                      }}
                    </span>
                  </a-tooltip>
                </div>
                <div
                  v-show="
                    item.secondExchangePair.split(',')[1] &&
                    robotPairInfo[item.secondExchangePair.split(',')[1]] &&
                    robotDepth[item.secondExchangePair.split(',')[1]]
                  "
                >
                  {{
                    robotPairInfo[item.secondExchangePair.split(',')[1]]
                      | filterPair(exchange[item.secondExchangeId])
                  }}
                  <a-tooltip placement="top">
                    <template slot="title">
                      <span class="token-price ask-price">
                        ask:
                        {{
                          robotDepth[item.secondExchangePair.split(',')[1]]
                            | filterDepth(
                              robotPairInfo[
                                [item.secondExchangePair.split(',')[1]]
                              ],
                              exchange[item.secondExchangeId],
                              'ask',
                              token1Unit
                            )
                        }}
                      </span>
                      <span
                        style="margin-left: 5px"
                        class="token-price bid-price"
                      >
                        bid:
                        {{
                          robotDepth[[item.secondExchangePair.split(',')[1]]]
                            | filterDepth(
                              robotPairInfo[
                                [item.secondExchangePair.split(',')[1]]
                              ],
                              exchange[item.secondExchangeId],
                              'bid',
                              token1Unit
                            )
                        }}
                      </span>
                    </template>
                    <span
                      v-if="robotStats[item.secondExchangePair.split(',')[1]]"
                      class="pointer"
                      :class="{
                        'base-red':
                          robotStats[item.secondExchangePair.split(',')[1]]
                            .latestPrice -
                            robotStats[item.secondExchangePair.split(',')[1]]
                              .lastPrice >
                          0,
                        'base-green':
                          robotStats[item.secondExchangePair.split(',')[1]]
                            .latestPrice -
                            robotStats[item.secondExchangePair.split(',')[1]]
                              .lastPrice <
                          0
                      }"
                    >
                      |
                      {{
                        robotStats[item.secondExchangePair.split(',')[1]]
                          .latestPrice | filterVal
                      }}
                    </span>
                  </a-tooltip>
                </div>
              </div>
              <div v-else>-</div>
            </td>
            <td>
              <div
                v-if="
                  (robotTypeName[item.typeId] === 'Timer Robot' &&
                    getTimerConfig(item.arguments) &&
                    !getTimerConfig(item.arguments).unilateral) ||
                  robotTypeName[item.typeId] === 'Maker Robot'
                "
              >
                <div>
                  {{
                    filterBalance(
                      robotPairInfo[item.secondExchangePair.split(',')[0]],
                      robotBalance,
                      robotAccounts[item.secondExchangeAccountId],
                      exchange[item.secondExchangeId],
                      true
                    ) | filterVal
                  }}
                  {{
                    robotPairInfo[item.secondExchangePair.split(',')[0]]
                      | filterSymbol(exchange[item.secondExchangeId], true)
                  }}
                </div>
                <div>
                  <span
                    v-if="
                      item.secondExchangePair &&
                      item.secondExchangePair.split(',').length > 1
                    "
                  >
                    {{
                      filterBalance(
                        robotPairInfo[item.secondExchangePair.split(',')[1]],
                        robotBalance,
                        robotAccounts[item.secondExchangeAccountId],
                        exchange[item.secondExchangeId],
                        true
                      ) | filterVal
                    }}
                    {{
                      robotPairInfo[item.secondExchangePair.split(',')[1]]
                        | filterSymbol(exchange[item.secondExchangeId], true)
                    }}
                  </span>
                  <span v-else>
                    {{
                      filterBalance(
                        robotPairInfo[item.secondExchangePair.split(',')[0]],
                        robotBalance,
                        robotAccounts[item.secondExchangeAccountId],
                        exchange[item.secondExchangeId],
                        false
                      ) | filterVal
                    }}
                    {{
                      robotPairInfo[item.secondExchangePair.split(',')[0]]
                        | filterSymbol(exchange[item.secondExchangeId], false)
                    }}
                  </span>
                </div>
              </div>
              <div v-else>-</div>
            </td>
            <td>
              <div v-if="robotTypeName[item.typeId] === 'Timer Robot'">
                <div v-if="getTimerConfig(item.arguments)">
                  <div>
                    {{ getTimerConfig(item.arguments).orderAmount }}
                    {{
                      robotPairInfo[item.mainExchangePair]
                        | filterSymbol(exchange[item.mainExchangeId], true)
                    }}
                    per order
                  </div>
                  <div>
                    Interval
                    {{ getTimerConfig(item.arguments).interval }} minutes
                  </div>
                  <div>
                    <span v-if="getTimerConfig(item.arguments).unilateral">
                      One-side
                    </span>
                    <span v-else>Two-sides</span>
                    <span v-if="getTimerConfig(item.arguments).arbitrage">
                      , Arbitrage only
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="robotTypeName[item.typeId] === 'Maker Robot'">
                <div v-if="getMakerConfig(item.arguments)">
                  <div>
                    {{ getMakerConfig(item.arguments).token1Amount }}
                    {{
                      robotPairInfo[item.mainExchangePair]
                        | filterSymbol(exchange[item.mainExchangeId], false)
                    }}
                    per order
                  </div>
                  <div>
                    Min profit
                    {{ getMakerConfig(item.arguments).minimumProfit }}%
                  </div>
                  <div>
                    Price fluctuation
                    {{
                      getMakerConfig(item.arguments).minimumPriceFluctuation
                    }}%
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div>
                <span :class="{ 'base-green': item.status === 'Running' }">
                  {{ item.status }}
                </span>
                <span
                  :class="{ 'base-red': !!item.newErrors }"
                  @click="showErrors(item)"
                  class="pointer"
                >
                  Errors({{ item.errors }})
                </span>
              </div>
            </td>
            <td class="operation-td">
              <div class="operation">
                <span @click="showView(item)">View</span>
                <span
                  :class="{ disabled: item.status === 'Running' }"
                  @click="showUpdateConfig(item, index)"
                  >Config</span
                >
                <span
                  @click="
                    showRun(
                      item,
                      index,
                      robotTypeName[item.typeId],
                      item.arguments,
                      robotPairInfo[item.mainExchangePair],
                      robotBalance,
                      robotAccounts[item.mainExchangeAccountId],
                      exchange[item.mainExchangeId]
                    )
                  "
                  v-show="item.status === 'Stopped'"
                  >Run</span
                >
                <span
                  v-show="item.status === 'Running'"
                  @click="showStop(item, index)"
                  >Stop</span
                >
                <span
                  @click="deleteRobot(item)"
                  :class="{ disabled: item.status === 'Running' }"
                  >Delete</span
                >
              </div>
            </td>
          </tr>
          <tr v-if="!total && !spinningExchange">
            <td align="center" colspan="9">
              <div>No robots</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination-bottom">
        <a-pagination
          v-if="total > pageSize"
          class="transactions-pagination"
          v-model="page"
          :total="total"
          :defaultPageSize="pageSize"
          :showQuickJumper="true"
          @change="pageChange"
        />
      </div>
    </a-spin>
    <div class="flex-center base-font-normal mt20">
      <div class="dashboard-title">Orders</div>
      <a-select
        class="robot-filter-select select-pair"
        v-model="filterRobot.id"
        style="width: 200px"
        notFoundContent="Not Found"
        @change="changeFilter"
      >
        <a-select-option value="all">
          <span class="base-color-w">All</span>
        </a-select-option>
        <a-select-option v-for="robot in robots" :key="robot.id">
          <div class="base-color-w flex-center">
            {{ robot.id }}
            <div v-show="robotPairInfo[robot.mainExchangePair]">
              &nbsp;{{
                robotPairInfo[robot.mainExchangePair]
                  | filterPair(exchange[robot.mainExchangeId])
              }}
            </div>
          </div>
        </a-select-option>
      </a-select>
      <span class="pointer margin-left-auto" @click="cancelAll"
        >Cancel All</span
      >
    </div>
    <a-spin :spinning="spinningOrders" class="table-spinning">
      <table class="mt20">
        <thead>
          <tr>
            <th>ID</th>
            <th>Robot ID</th>
            <th>Main Exchange</th>
            <th>OrderId</th>
            <th>Swap</th>
            <th class="table-line">Second Exchange</th>
            <th>OrderId</th>
            <th>Swap</th>
            <th>Earnings</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in orders" :key="item.mainExchangeOrderId">
            <td>{{ item.id }}</td>
            <td>{{ item.strategyId }}</td>
            <td>
              {{ exchange[item.strategy.mainExchangeId] }}
            </td>
            <td>
              <a
                v-if="exchange[item.strategy.mainExchangeId] === 'ICDex'"
                :href="`https://ic.house/swap/${item.strategy.mainExchangePair}/${item.mainExchangeOrderId}`"
                rel="nofollow noreferrer noopener"
                target="_blank"
              >
                <copy-account
                  :account="item.mainExchangeOrderId"
                  placement="left"
                  copy-text="txid"
                ></copy-account>
              </a>
              <span v-else>
                {{ item.mainExchangeOrderId }}
              </span>
            </td>
            <td
              :class="{
                'base-green': filterOrderStatus(item, exchange) === 'Completed',
                'base-red': filterOrderStatus(item, exchange) === 'Cancelled'
              }"
            >
              <div>{{ filterOrderStatus(item, exchange) }}:</div>
              <div v-if="exchange[item.strategy.mainExchangeId] === 'ICDex'">
                <div>
                  <div class="swap-info">
                    <div v-if="item.mainExchangeOrderInfo" class="flex-center">
                      <div
                        v-if="
                          filterSide(item.mainExchangeOrderInfo, 'ICDex') ===
                          'Sell'
                        "
                      >
                        {{
                          getSellToken0(
                            item.mainExchangeOrderInfo,
                            item.balanceChangesFilled,
                            robotPairInfo
                          ) | filterVal
                        }}
                        <span class="span-nbsp"></span
                        >{{
                          robotPairInfo[item.strategy.mainExchangePair]
                            | filterSymbol(
                              exchange[item.strategy.mainExchangeId],
                              true
                            )
                        }}
                      </div>
                      <div
                        v-if="
                          filterSide(item.mainExchangeOrderInfo, 'ICDex') ===
                          'Buy'
                        "
                      >
                        {{
                          getBuyToken1(
                            item.mainExchangeOrderInfo,
                            item.balanceChangesFilled,
                            robotPairInfo
                          ) | filterVal
                        }}
                        <span class="span-nbsp"></span
                        >{{
                          robotPairInfo[item.strategy.mainExchangePair]
                            | filterSymbol(
                              exchange[item.strategy.mainExchangeId],
                              false
                            )
                        }}
                      </div>
                      <span class="span-nbsp"></span>-><span
                        class="span-nbsp"
                      ></span>
                      <div
                        v-if="
                          filterSide(item.mainExchangeOrderInfo, 'ICDex') ===
                          'Sell'
                        "
                      >
                        {{
                          getSellToken1(
                            item.mainExchangeOrderInfo,
                            item.balanceChangesFilled,
                            robotPairInfo
                          ) | filterVal
                        }}
                        <span class="span-nbsp"></span
                        >{{
                          robotPairInfo[item.strategy.mainExchangePair]
                            | filterSymbol(
                              exchange[item.strategy.mainExchangeId],
                              false
                            )
                        }}
                      </div>
                      <div
                        v-if="
                          filterSide(item.mainExchangeOrderInfo, 'ICDex') ===
                          'Buy'
                        "
                      >
                        {{
                          getBuyToken0(
                            item.mainExchangeOrderInfo,
                            item.balanceChangesFilled,
                            robotPairInfo
                          ) | filterVal
                        }}
                        <span class="span-nbsp"></span
                        >{{
                          robotPairInfo[item.strategy.mainExchangePair]
                            | filterSymbol(
                              exchange[item.strategy.mainExchangeId],
                              true
                            )
                        }}
                      </div>
                    </div>
                    <div v-else>-</div>
                  </div>
                </div>
                <span class="line2 fs12" v-if="item.mainExchangeOrderInfo">
                  (price:
                  <span>
                    {{ getICDexPrice(item, robotPairInfo, exchange) }}</span
                  >)
                </span>
              </div>
              <div v-if="exchange[item.strategy.mainExchangeId] === 'Binance'">
                <div v-if="item.mainExchangeOrderInfo" class="flex-center">
                  <div v-if="item.mainExchangeOrderInfo.side === 'SELL'">
                    <span>
                      {{
                        getSellToken0Binance(
                          item.mainExchangeOrderInfo,
                          item.balanceChangesFilled
                        ) | filterVal
                      }}
                      {{
                        getBinanceSymbol(
                          item.mainExchangeOrderInfo.symbol,
                          robotPairInfo
                        ).base
                      }}
                    </span>
                  </div>
                  <div v-if="item.mainExchangeOrderInfo.side === 'BUY'">
                    <span>
                      {{
                        getBuyToken1Binance(
                          item.mainExchangeOrderInfo,
                          item.balanceChangesFilled
                        ) | filterVal
                      }}
                      {{
                        getBinanceSymbol(
                          item.mainExchangeOrderInfo.symbol,
                          robotPairInfo
                        ).quote
                      }}
                    </span>
                  </div>
                  <span class="span-nbsp"></span>-><span
                    class="span-nbsp"
                  ></span>
                  <div v-if="item.mainExchangeOrderInfo.side === 'SELL'">
                    {{
                      getSellToken1Binance(
                        item.mainExchangeOrderInfo,
                        item.balanceChangesFilled
                      ) | filterVal
                    }}
                    {{
                      getBinanceSymbol(
                        item.mainExchangeOrderInfo.symbol,
                        robotPairInfo
                      ).quote
                    }}
                  </div>
                  <div v-if="item.mainExchangeOrderInfo.side === 'BUY'">
                    {{
                      getBuyToken0Binance(
                        item.mainExchangeOrderInfo,
                        item.balanceChangesFilled
                      ) | filterVal
                    }}
                    {{
                      getBinanceSymbol(
                        item.mainExchangeOrderInfo.symbol,
                        robotPairInfo
                      ).base
                    }}
                  </div>
                </div>
                <span class="line2 fs12" v-if="item.mainExchangeOrderInfo">
                  (price:
                  <span>
                    {{ getBinancePrice(item, robotPairInfo, exchange) }}</span
                  >)
                </span>
              </div>
            </td>
            <td class="table-line">
              {{ exchange[item.strategy.secondExchangeId] }}
            </td>
            <td>
              <div
                v-if="exchange[item.strategy.secondExchangeId] === 'Binance'"
              >
                <div v-if="item.secondExchangeOrderInfo.length">
                  <div
                    v-for="info in item.secondExchangeOrderInfo"
                    :key="info.id"
                  >
                    {{ info.symbol }}: {{ info.orderId }}
                  </div>
                </div>
                <div v-else>-</div>
              </div>
              <div v-if="exchange[item.strategy.secondExchangeId] === 'ICDex'">
                <div v-if="item.secondExchangeOrderInfo.length">
                  <div
                    v-for="info in item.secondExchangeOrderInfo"
                    :key="info.id"
                    class="flex-center"
                  >
                    {{
                      robotPairInfo[info.pairId]
                        | filterPair(exchange[item.strategy.secondExchangeId])
                    }}:
                    <a
                      v-if="
                        exchange[item.strategy.secondExchangeId] === 'ICDex'
                      "
                      :href="`https://ic.house/swap/${info.pairId}/${info.orderId}`"
                      rel="nofollow noreferrer noopener"
                      target="_blank"
                    >
                      <copy-account
                        :account="info.orderId"
                        placement="left"
                        copy-text="txid"
                      ></copy-account>
                    </a>
                  </div>
                </div>
                <div v-else>-</div>
              </div>
            </td>
            <td>
              <div v-if="item.secondExchangeOrderInfo.length">
                <div
                  v-if="exchange[item.strategy.secondExchangeId] === 'Binance'"
                >
                  <div
                    v-for="info in item.secondExchangeOrderInfo"
                    :key="info.id"
                    class="lineHalf"
                  >
                    <div v-if="info.side === 'SELL'">
                      <span>
                        {{ info.executedQty | filterVal }}
                        {{ getBinanceSymbol(info.symbol, robotPairInfo).base }}
                        <span class="span-nbsp"></span>-><span
                          class="span-nbsp"
                        ></span>
                        {{ info.cummulativeQuoteQty | filterVal }}
                        {{ getBinanceSymbol(info.symbol, robotPairInfo).quote }}
                      </span>
                    </div>
                    <div v-if="info.side === 'BUY'">
                      <span>
                        {{ info.cummulativeQuoteQty | filterVal }}
                        {{ getBinanceSymbol(info.symbol, robotPairInfo).quote }}
                        <span class="span-nbsp"></span>-><span
                          class="span-nbsp"
                        ></span>
                        {{ info.executedQty | filterVal }}
                        {{ getBinanceSymbol(info.symbol, robotPairInfo).base }}
                      </span>
                    </div>
                  </div>
                  <div class="lineHalf">
                    <span
                      v-if="
                        item.secondExchangeOrderInfo &&
                        item.secondExchangeOrderInfo.length
                      "
                    >
                      (price:
                      <span>
                        {{
                          getBinancePrice(item, robotPairInfo, exchange)
                        }}</span
                      >)
                    </span>
                    <span v-else>-</span>
                  </div>
                </div>
                <div
                  v-if="exchange[item.strategy.secondExchangeId] === 'ICDex'"
                >
                  <div
                    v-for="info in item.secondExchangeOrderInfo"
                    :key="info.id"
                    class="lineHalf flex-center"
                  >
                    <div v-if="filterSide(info, 'ICDex') === 'Sell'">
                      {{
                        getSellToken0(
                          info,
                          { token0: 0, token1: 0 },
                          robotPairInfo
                        ) | filterVal
                      }}
                      <span class="span-nbsp"></span
                      >{{
                        robotPairInfo[info.pairId]
                          | filterSymbol(
                            exchange[item.strategy.secondExchangeId],
                            true
                          )
                      }}
                    </div>
                    <div v-if="filterSide(info, 'ICDex') === 'Buy'">
                      {{
                        getBuyToken1(
                          info,
                          { token0: 0, token1: 0 },
                          robotPairInfo
                        ) | filterVal
                      }}
                      <span class="span-nbsp"></span
                      >{{
                        robotPairInfo[info.pairId]
                          | filterSymbol(
                            exchange[item.strategy.secondExchangeId],
                            false
                          )
                      }}
                    </div>
                    <span class="span-nbsp"></span> ->
                    <span class="span-nbsp"></span>
                    <div v-if="filterSide(info, 'ICDex') === 'Sell'">
                      {{
                        getSellToken1(
                          info,
                          { token0: 0, token1: 0 },
                          robotPairInfo
                        ) | filterVal
                      }}
                      <span class="span-nbsp"></span
                      >{{
                        robotPairInfo[info.pairId]
                          | filterSymbol(
                            exchange[item.strategy.secondExchangeId],
                            false
                          )
                      }}
                    </div>
                    <div v-if="filterSide(info, 'ICDex') === 'Buy'">
                      {{
                        getBuyToken0(
                          info,
                          { token0: 0, token1: 0 },
                          robotPairInfo
                        ) | filterVal
                      }}
                      <span class="span-nbsp"></span
                      >{{
                        robotPairInfo[info.pairId]
                          | filterSymbol(
                            exchange[item.strategy.secondExchangeId],
                            true
                          )
                      }}
                    </div>
                  </div>
                  <div class="lineHalf">
                    <span class="line2 fs12">
                      (price:
                      <span>
                        {{ getICDexPrice(item, robotPairInfo, exchange) }}</span
                      >)
                    </span>
                  </div>
                </div>
              </div>
              <div v-else>-</div>
            </td>
            <td>
              <span
                v-if="
                  item.secondExchangeOrderInfo && item.mainExchangeOrderInfo
                "
                :class="{
                  'base-red':
                    parseFloat(getEarnings(item, exchange, robotPairInfo)) < 0,
                  'base-green':
                    parseFloat(getEarnings(item, exchange, robotPairInfo)) > 0
                }"
              >
                {{ getEarnings(item, exchange, robotPairInfo) }}
              </span>
              <span v-else>-</span>
            </td>
            <td>{{ item.updateTime | formatDateToUTC }}</td>
          </tr>
          <tr v-if="!totalOrder && !spinningOrders">
            <td align="center" colspan="10">
              <div>No orders</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination-bottom">
        <a-pagination
          v-if="totalOrder > pageSizeOrder"
          class="transactions-pagination"
          v-model="pageOrder"
          :total="totalOrder"
          :defaultPageSize="pageSizeOrder"
          :showQuickJumper="true"
          @change="pageChangeOrder"
        />
      </div>
    </a-spin>
    <a-modal
      :after-close="afterClose"
      :footer="null"
      :keyboard="false"
      :maskClosable="false"
      centered
      class="add-robot-modal global-spinning"
      :title="title"
      v-model="visible"
      width="625px"
    >
      <a-spin :spinning="spinningConfig">
        <div v-show="type === 'Add'" class="base-font-title">
          <div>
            <span class="add-label">Robot type:</span>
            <a-select
              class="account-list-select"
              :disabled="disabledType"
              notFoundContent="Not Found"
              placeholder="Select robot type"
              style="width: 270px"
              v-model="selectedType.id"
            >
              <a-select-option
                :key="item.id"
                class="account-select-option"
                v-for="item in robotType"
              >
                <span>{{ item.name }}</span>
              </a-select-option>
            </a-select>
          </div>
          <span class="horizontal-line"></span>
          <select-exchange
            :disabled-selected-exchange="disabledSelectedMainExchange"
            ref="selectChange"
            :exchange="exchange"
            :exchanges="mainExchanges"
            :ICDexAccounts="ICDexAccounts"
            :binance-accounts="BinanceAccounts"
            @changeExchange="changeMainExchange"
            @changePair="changePairMain"
            @changeAccount="changeMainAccount"
            @getICDexPairs="getICDexPairs"
            @getBinancePairs="getBinancePairs"
            @changeExchangeAccountFee="changeMainExchangeAccountFee"
            @addExchangeAccountSuccess="addExchangeAccountSuccess"
            type="Main"
          ></select-exchange>
          <span class="horizontal-line"></span>
          <select-exchange
            :disabled-selected-exchange="disabledSelectedExchange"
            :exchange="exchange"
            :exchanges="secondExchanges"
            :ICDexAccounts="ICDexAccounts"
            :binance-accounts="BinanceAccounts"
            @changeExchange="changeSecondExchange"
            @changePair="changePairSecond"
            @changePairTwo="changePairTwo"
            @changeAccount="changeSecondAccount"
            @changeExchangeAccountFee="changeSecondExchangeAccountFee"
            @changeInvert="changeInvert"
            ref="secondSelectExchange"
            type="Second"
            @addExchangeAccountSuccess="addExchangeAccountSuccess"
          ></select-exchange>
          <span class="horizontal-line"></span>
        </div>
        <div
          v-show="
            robotTypeName && robotTypeName[selectedType.id] === 'Timer Robot'
          "
        >
          <span class="add-label">Config:</span>
          <a-form-model
            :model="configForm"
            :rules="configFormRules"
            ref="configForm"
          >
            <div class="flex-center" style="justify-content: space-between">
              <a-form-model-item
                label="OrderAmount (token0)"
                prop="orderAmount"
              >
                <a-input
                  :key="token0Unit"
                  :placeholder="`${timerToken0} amount`"
                  autocomplete="off"
                  style="width: 240px; margin-right: 10px"
                  v-model="configForm.orderAmount"
                  v-only-float="token0Unit"
                />
              </a-form-model-item>
              <a-form-model-item label="Interval (minutes)" prop="interval">
                <a-input
                  autocomplete="off"
                  placeholder="Interval(minutes)"
                  style="width: 240px"
                  v-model="configForm.interval"
                  v-only-number
                />
              </a-form-model-item>
            </div>
            <div class="flex-center">
              <a-form-model-item>
                <a-checkbox
                  :checked="configForm.unilateral"
                  @change="configForm.unilateral = !configForm.unilateral"
                  class="base-font-title"
                >
                  Execute unilateral only
                </a-checkbox>
              </a-form-model-item>
              <a-form-model-item>
                <a-checkbox
                  :checked="configForm.arbitrage"
                  @change="configForm.arbitrage = !configForm.arbitrage"
                  class="base-font-title"
                  style="margin-left: 10px"
                  >Execute arbitrage only
                </a-checkbox>
              </a-form-model-item>
            </div>
          </a-form-model>
          <div class="mt20">
            <button type="button" class="primary w100" @click="submitTimer">
              Confirm
            </button>
          </div>
        </div>
        <div
          v-show="
            robotTypeName && robotTypeName[selectedType.id] === 'Maker Robot'
          "
        >
          <span class="add-label">Config:</span>
          <a-form-model
            :model="configFormMaker"
            :rules="configFormMakerRules"
            ref="configFormMaker"
          >
            <div
              class="flex-center config-arbitrage-form"
              style="justify-content: space-between"
            >
              <a-form-model-item
                :label="`${configToken1} Amount`"
                prop="token1Amount"
              >
                <a-input
                  :key="token1Unit"
                  v-model="configFormMaker.token1Amount"
                  autocomplete="off"
                  v-only-float="token1Unit"
                  :placeholder="`${configToken1} amount per order`"
                  style="width: 240px"
                />
              </a-form-model-item>
              <a-form-model-item label="Minimum Profit" prop="minimumProfit">
                <a-input
                  v-model="configFormMaker.minimumProfit"
                  v-only-float="3"
                  suffix="%"
                  placeholder="Minimum Profit"
                  style="width: 240px"
                />
              </a-form-model-item>
            </div>
            <div class="flex-center">
              <a-form-model-item
                label="Price % change on reorder"
                prop="minimumPriceFluctuation"
              >
                <a-input
                  v-model="configFormMaker.minimumPriceFluctuation"
                  v-only-float="3"
                  suffix="%"
                  placeholder="Price % change on reorder"
                  style="width: 240px"
                />
              </a-form-model-item>
            </div>
          </a-form-model>
          <div class="mt20">
            <button type="button" class="primary w100" @click="submitMaker">
              Confirm
            </button>
          </div>
        </div>
      </a-spin>
    </a-modal>
    <a-modal
      :footer="null"
      :keyboard="false"
      :maskClosable="false"
      centered
      class="add-robot-modal global-spinning"
      :title="titleView"
      v-model="visibleView"
      width="800px"
    >
      <div v-if="viewRobot" class="base-font-title view-robot">
        <div class="flex-center">
          <span class="view-robot-label">Robot type:</span
          >{{ robotTypeName[viewRobot.typeId] }}
        </div>
        <span class="horizontal-line"></span>
        <div class="mt20 flex-center">
          <span class="view-robot-label">Main Exchange:</span>
          {{ exchange[viewRobot.mainExchangeId] }}
        </div>
        <div class="mt20 flex-center flex-start">
          <span class="view-robot-label">Pair:</span>
          <div>
            {{
              robotPairInfo[viewRobot.mainExchangePair]
                | filterPair(exchange[viewRobot.mainExchangeId])
            }}
            <div>
              <span class="ask-price">
                ask:
                {{
                  robotDepth[viewRobot.mainExchangePair]
                    | filterDepth(
                      robotPairInfo[viewRobot.mainExchangePair],
                      exchange[viewRobot.mainExchangeId],
                      'ask',
                      token1Unit
                    )
                }}
              </span>
              <span style="margin-left: 5px" class="bid-price">
                bid:
                {{
                  robotDepth[viewRobot.mainExchangePair]
                    | filterDepth(
                      robotPairInfo[viewRobot.mainExchangePair],
                      exchange[viewRobot.mainExchangeId],
                      'bid',
                      token1Unit
                    )
                }}
              </span>
            </div>
          </div>
        </div>
        <div class="mt20 flex-center">
          <span class="view-robot-label">Account:</span>
          {{ robotAccounts[viewRobot.mainExchangeAccountId].name }}&nbsp;(
          <span v-show="exchange[viewRobot.mainExchangeId] === 'ICDex'">
            <copy-account
              :account="
                filterICDexAccount(
                  robotAccounts[viewRobot.mainExchangeAccountId].value
                )
              "
            >
            </copy-account>
          </span>
          <span v-show="exchange[viewRobot.mainExchangeId] === 'Binance'">
            <copy-account
              :account="
                filterBinanceAPIKey(
                  robotAccounts[viewRobot.mainExchangeAccountId].value
                )
              "
              copy-text="API Key"
            >
            </copy-account>
          </span>
          )
        </div>
        <div class="mt20 flex-center">
          <span class="view-robot-label">Fee:</span>
          {{ viewRobot.mainExchangeFee | filterFee }}%
        </div>
        <div v-if="exchange[viewRobot.mainExchangeId] === 'ICDex'">
          <div class="mt20 flex-center">
            <span class="view-robot-label"
              >Wallet balances
              <a-icon
                @click="
                  refreshBalance(
                    robotAccounts[viewRobot.mainExchangeAccountId],
                    viewRobot.secondExchangePair
                  )
                "
                class="reload-icon"
                type="reload"
                v-show="!refreshBalanceLoading"
                style="font-size: 13px"
              />
              <a-icon
                class="reload-icon"
                type="loading"
                v-show="refreshBalanceLoading"
                style="font-size: 13px"
              />
              :
            </span>
            <div class="flex-center flex-grow">
              <div class="flex1">
                {{
                  robotPairInfo[viewRobot.mainExchangePair]
                    | filterSymbol(exchange[viewRobot.mainExchangeId], true)
                }}:
                {{
                  robotPairInfo[viewRobot.mainExchangePair]
                    | filterWalterBalance(
                      robotAccounts[viewRobot.mainExchangeAccountId],
                      robotICDexLocalBalance,
                      true
                    )
                    | filterVal
                }}
              </div>
              <div class="flex1">
                {{
                  robotPairInfo[viewRobot.mainExchangePair]
                    | filterSymbol(exchange[viewRobot.mainExchangeId], false)
                }}:
                {{
                  robotPairInfo[viewRobot.mainExchangePair]
                    | filterWalterBalance(
                      robotAccounts[viewRobot.mainExchangeAccountId],
                      robotICDexLocalBalance,
                      false
                    )
                    | filterVal
                }}
              </div>
            </div>
          </div>
          <div class="mt20 flex-center flex-start">
            <span class="view-robot-label">
              Trader Account
              <a-icon
                @click="
                  refreshBalanceTraderAccount(
                    robotAccounts[viewRobot.mainExchangeAccountId],
                    viewRobot.mainExchangePair
                  )
                "
                class="reload-icon"
                type="reload"
                v-show="!refreshBalanceTraderAccountLoading"
                style="font-size: 13px"
              />
              <a-icon
                class="reload-icon"
                type="loading"
                v-show="refreshBalanceTraderAccountLoading"
                style="font-size: 13px"
              />
              :
            </span>
            <div class="flex-center flex1">
              <div class="flex1">
                <div>
                  {{
                    robotPairInfo[viewRobot.mainExchangePair]
                      | filterSymbol(exchange[viewRobot.mainExchangeId], true)
                  }}:
                  {{
                    filterBalance(
                      robotPairInfo[viewRobot.mainExchangePair],
                      robotBalance,
                      robotAccounts[viewRobot.mainExchangeAccountId],
                      exchange[viewRobot.mainExchangeId],
                      true
                    ) | filterVal
                  }}
                  <a-tooltip placement="top">
                    <template slot="title"> Withdraw </template>
                    <a-icon
                      @click="
                        onKeepingBalance(
                          robotAccounts[viewRobot.mainExchangeAccountId],
                          robotPairInfo[viewRobot.mainExchangePair],
                          true
                        )
                      "
                      style="margin-left: 5px; color: #5d6470"
                      class="pointer"
                      type="minus-circle"
                    />
                  </a-tooltip>
                  <a-tooltip placement="top">
                    <template slot="title"> Deposit </template>
                    <a-icon
                      @click="
                        onDepositKeepingBalance(
                          robotAccounts[viewRobot.mainExchangeAccountId],
                          robotPairInfo[viewRobot.mainExchangePair],
                          true
                        )
                      "
                      class="pointer"
                      type="plus-circle"
                      style="margin-left: 8px; color: #5d6470"
                    />
                  </a-tooltip>
                </div>
                <div
                  class="flex-center base-red"
                  v-if="
                    robotTypeName[viewRobot.typeId] === 'Timer Robot' &&
                    insufficientBalance(
                      robotTypeName[viewRobot.typeId],
                      viewRobot.arguments,
                      robotPairInfo[viewRobot.mainExchangePair],
                      robotBalance,
                      robotAccounts[viewRobot.mainExchangeAccountId],
                      exchange[viewRobot.mainExchangeId]
                    )
                  "
                >
                  insufficient balance
                </div>
              </div>
              <div class="flex1">
                <div>
                  {{
                    robotPairInfo[viewRobot.mainExchangePair]
                      | filterSymbol(exchange[viewRobot.mainExchangeId], false)
                  }}:
                  {{
                    filterBalance(
                      robotPairInfo[viewRobot.mainExchangePair],
                      robotBalance,
                      robotAccounts[viewRobot.mainExchangeAccountId],
                      exchange[viewRobot.mainExchangeId],
                      false
                    ) | filterVal
                  }}
                  <a-tooltip placement="top">
                    <template slot="title"> Withdraw </template>
                    <a-icon
                      @click="
                        onKeepingBalance(
                          robotAccounts[viewRobot.mainExchangeAccountId],
                          robotPairInfo[viewRobot.mainExchangePair],
                          false
                        )
                      "
                      style="margin-left: 5px; color: #5d6470"
                      class="pointer"
                      type="minus-circle"
                    />
                  </a-tooltip>
                  <a-tooltip placement="top">
                    <template slot="title"> Deposit </template>
                    <a-icon
                      @click="
                        onDepositKeepingBalance(
                          robotAccounts[viewRobot.mainExchangeAccountId],
                          robotPairInfo[viewRobot.mainExchangePair],
                          false
                        )
                      "
                      class="pointer"
                      type="plus-circle"
                      style="margin-left: 8px; color: #5d6470"
                    />
                  </a-tooltip>
                </div>
                <div
                  class="flex-center base-red"
                  v-if="
                    robotTypeName[viewRobot.typeId] === 'Maker Robot' &&
                    insufficientBalance(
                      robotTypeName[viewRobot.typeId],
                      viewRobot.arguments,
                      robotPairInfo[viewRobot.mainExchangePair],
                      robotBalance,
                      robotAccounts[viewRobot.mainExchangeAccountId],
                      exchange[viewRobot.mainExchangeId]
                    )
                  "
                >
                  insufficient balance
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          class="mt20 flex-center"
          v-if="exchange[viewRobot.mainExchangeId] === 'Binance'"
        >
          <span class="view-robot-label">
            Balances
            <a-icon
              @click="
                refreshBinanceBalance(
                  robotAccounts[viewRobot.mainExchangeAccountId]
                )
              "
              class="reload-icon"
              type="reload"
              v-show="!refreshBinanceBalanceLoading"
              style="font-size: 13px"
            />
            <a-icon
              class="reload-icon"
              type="loading"
              v-show="refreshBinanceBalanceLoading"
              style="font-size: 13px"
            />
            :
          </span>
          <div class="flex-center flex-grow">
            <div class="flex1">
              {{
                robotPairInfo[viewRobot.mainExchangePair.split(',')[0]]
                  | filterSymbol(exchange[viewRobot.mainExchangeId], true)
              }}:
              {{
                filterBalance(
                  robotPairInfo[viewRobot.mainExchangePair.split(',')[0]],
                  robotBalance,
                  robotAccounts[viewRobot.mainExchangeAccountId],
                  exchange[viewRobot.mainExchangeId],
                  true
                ) | filterVal
              }}
            </div>
            <div class="flex1">
              <span
                v-if="
                  viewRobot.mainExchangePair &&
                  viewRobot.mainExchangePair.split(',').length > 1
                "
              >
                {{
                  robotPairInfo[viewRobot.mainExchangePair.split(',')[1]]
                    | filterSymbol(exchange[viewRobot.mainExchangeId], true)
                }}:
                {{
                  filterBalance(
                    robotPairInfo[viewRobot.mainExchangePair.split(',')[1]],
                    robotBalance,
                    robotAccounts[viewRobot.mainExchangeAccountId],
                    exchange[viewRobot.mainExchangeId],
                    true
                  ) | filterVal
                }}
              </span>
              <span v-else>
                {{
                  robotPairInfo[viewRobot.mainExchangePair.split(',')[0]]
                    | filterSymbol(exchange[viewRobot.mainExchangeId], false)
                }}:
                {{
                  filterBalance(
                    robotPairInfo[viewRobot.mainExchangePair.split(',')[0]],
                    robotBalance,
                    robotAccounts[viewRobot.mainExchangeAccountId],
                    exchange[viewRobot.mainExchangeId],
                    false
                  ) | filterVal
                }}
              </span>
            </div>
          </div>
        </div>
        <span class="horizontal-line"></span>
        <div
          v-if="
            (robotTypeName[viewRobot.typeId] === 'Timer Robot' &&
              getTimerConfig(viewRobot.arguments) &&
              !getTimerConfig(viewRobot.arguments).unilateral) ||
            robotTypeName[viewRobot.typeId] === 'Maker Robot'
          "
        >
          <div class="mt20 flex-center">
            <span class="view-robot-label">Second Exchange: </span>
            {{ exchange[viewRobot.secondExchangeId] }}
          </div>
          <div class="mt20 flex-center flex-start">
            <span class="view-robot-label">Pair: </span>
            <div class="flex-center">
              <div>
                {{
                  robotPairInfo[viewRobot.secondExchangePair.split(',')[0]]
                    | filterPair(exchange[viewRobot.secondExchangeId])
                }}
                <span v-if="!viewRobot.secondExchangePair.split(',')[1]">
                  &nbsp;<a-checkbox
                    default-checked
                    v-show="viewRobot.invert"
                    disabled
                    class="view-invert-pair"
                  >
                    Invert
                  </a-checkbox>
                </span>
                <div>
                  <span class="ask-price">
                    ask:
                    {{
                      robotDepth[viewRobot.secondExchangePair.split(',')[0]]
                        | filterDepth(
                          robotPairInfo[
                            [viewRobot.secondExchangePair.split(',')[0]]
                          ],
                          exchange[viewRobot.secondExchangeId],
                          'ask',
                          token1Unit
                        )
                    }}
                  </span>
                  <span style="margin-left: 5px" class="bid-price">
                    bid:
                    {{
                      robotDepth[[viewRobot.secondExchangePair.split(',')[0]]]
                        | filterDepth(
                          robotPairInfo[
                            [viewRobot.secondExchangePair.split(',')[0]]
                          ],
                          exchange[viewRobot.secondExchangeId],
                          'bid',
                          token1Unit
                        )
                    }}
                  </span>
                </div>
              </div>
              <div
                style="margin-left: 10px"
                v-if="viewRobot.secondExchangePair.split(',')[1]"
              >
                <span>
                  {{
                    robotPairInfo[viewRobot.secondExchangePair.split(',')[1]]
                      | filterPair(exchange[viewRobot.secondExchangeId])
                  }}
                </span>
                &nbsp;<a-checkbox
                  default-checked
                  v-show="viewRobot.invert"
                  disabled
                  class="view-invert-pair"
                >
                  Invert
                </a-checkbox>
                <div>
                  <span class="ask-price">
                    ask:
                    {{
                      robotDepth[viewRobot.secondExchangePair.split(',')[1]]
                        | filterDepth(
                          robotPairInfo[
                            [viewRobot.secondExchangePair.split(',')[1]]
                          ],
                          exchange[viewRobot.secondExchangeId],
                          'ask',
                          token1Unit
                        )
                    }}
                  </span>
                  <span style="margin-left: 5px" class="bid-price">
                    bid:
                    {{
                      robotDepth[[viewRobot.secondExchangePair.split(',')[1]]]
                        | filterDepth(
                          robotPairInfo[
                            [viewRobot.secondExchangePair.split(',')[1]]
                          ],
                          exchange[viewRobot.secondExchangeId],
                          'bid',
                          token1Unit
                        )
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div class="mt20 flex-center">
            <span class="view-robot-label">Account: </span>
            {{ robotAccounts[viewRobot.secondExchangeAccountId].name }}&nbsp;(
            <span v-show="exchange[viewRobot.secondExchangeId] === 'ICDex'">
              <copy-account
                :account="
                  filterICDexAccount(
                    robotAccounts[viewRobot.secondExchangeAccountId].value
                  )
                "
              >
              </copy-account>
            </span>
            <span v-show="exchange[viewRobot.secondExchangeId] === 'Binance'">
              <copy-account
                :account="
                  filterBinanceAPIKey(
                    robotAccounts[viewRobot.secondExchangeAccountId].value
                  )
                "
                copy-text="API Key"
              >
              </copy-account>
            </span>
            )
          </div>
          <div class="mt20 flex-center">
            <span class="view-robot-label">Fee: </span>
            {{ viewRobot.secondExchangeFee | filterFee }}%
          </div>
          <div v-if="exchange[viewRobot.secondExchangeId] === 'ICDex'">
            <div class="mt20 flex-center">
              <span class="view-robot-label"
                >Wallet balances
                <a-icon
                  @click="
                    refreshBalance(
                      robotAccounts[viewRobot.secondExchangeAccountId],
                      viewRobot.secondExchangePair
                    )
                  "
                  class="reload-icon"
                  type="reload"
                  v-show="!refreshBalanceLoading"
                  style="font-size: 13px"
                />
                <a-icon
                  class="reload-icon"
                  type="loading"
                  v-show="refreshBalanceLoading"
                  style="font-size: 13px"
                />
                :
              </span>
              <div class="flex-center flex-grow">
                <div class="flex1">
                  {{
                    robotPairInfo[viewRobot.secondExchangePair.split(',')[0]]
                      | filterSymbol(
                        exchange[viewRobot.secondExchangeId],
                        true
                      )
                  }}:
                  {{
                    robotPairInfo[viewRobot.secondExchangePair.split(',')[0]]
                      | filterWalterBalance(
                        robotAccounts[viewRobot.secondExchangeAccountId],
                        robotICDexLocalBalance,
                        true
                      )
                      | filterVal
                  }}
                </div>
                <div class="flex1">
                  <div
                    v-if="
                      viewRobot.secondExchangePair &&
                      viewRobot.secondExchangePair.split(',').length > 1
                    "
                  >
                    {{
                      robotPairInfo[viewRobot.secondExchangePair.split(',')[1]]
                        | filterSymbol(
                          exchange[viewRobot.secondExchangeId],
                          true
                        )
                    }}:
                    {{
                      robotPairInfo[viewRobot.secondExchangePair.split(',')[1]]
                        | filterWalterBalance(
                          robotAccounts[viewRobot.secondExchangeAccountId],
                          robotICDexLocalBalance,
                          true
                        )
                        | filterVal
                    }}
                  </div>
                  <div v-else>
                    {{
                      robotPairInfo[viewRobot.secondExchangePair.split(',')[0]]
                        | filterSymbol(
                          exchange[viewRobot.secondExchangeId],
                          false
                        )
                    }}:
                    {{
                      robotPairInfo[viewRobot.secondExchangePair.split(',')[0]]
                        | filterWalterBalance(
                          robotAccounts[viewRobot.secondExchangeAccountId],
                          robotICDexLocalBalance,
                          false
                        )
                        | filterVal
                    }}
                  </div>
                </div>
              </div>
            </div>
            <div class="mt20 flex-center">
              <span class="view-robot-label">
                Trader Account
                <a-icon
                  @click="
                    refreshBalanceTraderAccount(
                      robotAccounts[viewRobot.secondExchangeAccountId],
                      viewRobot.secondExchangePair
                    )
                  "
                  class="reload-icon"
                  type="reload"
                  v-show="!refreshBalanceTraderAccountLoading"
                  style="font-size: 13px"
                />
                <a-icon
                  class="reload-icon"
                  type="loading"
                  v-show="refreshBalanceTraderAccountLoading"
                  style="font-size: 13px"
                />
                :
              </span>
              <div class="flex-center flex1">
                <div class="flex1 flex-center">
                  {{
                    robotPairInfo[viewRobot.secondExchangePair.split(',')[0]]
                      | filterSymbol(
                        exchange[viewRobot.secondExchangeId],
                        true
                      )
                  }}:
                  {{
                    filterBalance(
                      robotPairInfo[viewRobot.secondExchangePair.split(',')[0]],
                      robotBalance,
                      robotAccounts[viewRobot.secondExchangeAccountId],
                      exchange[viewRobot.secondExchangeId],
                      true
                    ) | filterVal
                  }}
                  <a-tooltip placement="top">
                    <template slot="title"> Withdraw </template>
                    <a-icon
                      @click="
                        onKeepingBalance(
                          robotAccounts[viewRobot.secondExchangeAccountId],
                          robotPairInfo[
                            viewRobot.secondExchangePair.split(',')[0]
                          ],
                          true
                        )
                      "
                      style="margin-left: 5px; color: #5d6470"
                      class="pointer"
                      type="minus-circle"
                    />
                  </a-tooltip>
                  <a-tooltip placement="top">
                    <template slot="title"> Deposit </template>
                    <a-icon
                      @click="
                        onDepositKeepingBalance(
                          robotAccounts[viewRobot.secondExchangeAccountId],
                          robotPairInfo[
                            viewRobot.secondExchangePair.split(',')[0]
                          ],
                          true
                        )
                      "
                      class="pointer"
                      type="plus-circle"
                      style="margin-left: 8px; color: #5d6470"
                    />
                  </a-tooltip>
                </div>
                <div class="flex1 flex-center">
                  <div
                    v-if="
                      viewRobot.secondExchangePair &&
                      viewRobot.secondExchangePair.split(',').length > 1
                    "
                  >
                    {{
                      robotPairInfo[viewRobot.secondExchangePair.split(',')[1]]
                        | filterSymbol(
                          exchange[viewRobot.secondExchangeId],
                          true
                        )
                    }}:
                    {{
                      filterBalance(
                        robotPairInfo[
                          viewRobot.secondExchangePair.split(',')[1]
                        ],
                        robotBalance,
                        robotAccounts[viewRobot.secondExchangeAccountId],
                        exchange[viewRobot.secondExchangeId],
                        true
                      ) | filterVal
                    }}
                  </div>
                  <div v-else>
                    {{
                      robotPairInfo[viewRobot.secondExchangePair.split(',')[0]]
                        | filterSymbol(
                          exchange[viewRobot.secondExchangeId],
                          false
                        )
                    }}:
                    {{
                      filterBalance(
                        robotPairInfo[
                          viewRobot.secondExchangePair.split(',')[0]
                        ],
                        robotBalance,
                        robotAccounts[viewRobot.secondExchangeAccountId],
                        exchange[viewRobot.secondExchangeId],
                        false
                      ) | filterVal
                    }}
                  </div>
                  <a-tooltip placement="top">
                    <template slot="title"> Withdraw </template>
                    <a-icon
                      @click="
                        onKeepingBalance(
                          robotAccounts[viewRobot.secondExchangeAccountId],
                          viewRobot.secondExchangePair &&
                            viewRobot.secondExchangePair.split(',').length > 1
                            ? robotPairInfo[
                                viewRobot.secondExchangePair.split(',')[1]
                              ]
                            : robotPairInfo[
                                viewRobot.secondExchangePair.split(',')[0]
                              ],
                          viewRobot.secondExchangePair.split(',').length > 1
                        )
                      "
                      style="margin-left: 5px; color: #5d6470"
                      class="pointer"
                      type="minus-circle"
                    />
                  </a-tooltip>
                  <a-tooltip placement="top">
                    <template slot="title"> Deposit </template>
                    <a-icon
                      @click="
                        onDepositKeepingBalance(
                          robotAccounts[viewRobot.secondExchangeAccountId],
                          viewRobot.secondExchangePair &&
                            viewRobot.secondExchangePair.split(',').length > 1
                            ? robotPairInfo[
                                viewRobot.secondExchangePair.split(',')[1]
                              ]
                            : robotPairInfo[
                                viewRobot.secondExchangePair.split(',')[0]
                              ],
                          viewRobot.secondExchangePair.split(',').length > 1
                        )
                      "
                      class="pointer"
                      type="plus-circle"
                      style="margin-left: 8px; color: #5d6470"
                    />
                  </a-tooltip>
                </div>
              </div>
            </div>
          </div>
          <div
            class="mt20 flex-center"
            v-if="exchange[viewRobot.secondExchangeId] === 'Binance'"
          >
            <span class="view-robot-label">
              Balances
              <a-icon
                @click="
                  refreshBinanceBalance(
                    robotAccounts[viewRobot.secondExchangeAccountId]
                  )
                "
                class="reload-icon"
                type="reload"
                v-show="!refreshBinanceBalanceLoading"
                style="font-size: 13px"
              />
              <a-icon
                class="reload-icon"
                type="loading"
                v-show="refreshBinanceBalanceLoading"
                style="font-size: 13px"
              />
              :
            </span>
            <div class="flex-center flex-grow">
              <div class="flex1">
                {{
                  robotPairInfo[viewRobot.secondExchangePair.split(',')[0]]
                    | filterSymbol(exchange[viewRobot.secondExchangeId], true)
                }}:
                {{
                  filterBalance(
                    robotPairInfo[viewRobot.secondExchangePair.split(',')[0]],
                    robotBalance,
                    robotAccounts[viewRobot.secondExchangeAccountId],
                    exchange[viewRobot.secondExchangeId],
                    true
                  ) | filterVal
                }}
              </div>
              <div class="flex1">
                <span
                  v-if="
                    viewRobot.secondExchangePair &&
                    viewRobot.secondExchangePair.split(',').length > 1
                  "
                >
                  {{
                    robotPairInfo[viewRobot.secondExchangePair.split(',')[1]]
                      | filterSymbol(
                        exchange[viewRobot.secondExchangeId],
                        true
                      )
                  }}:
                  {{
                    filterBalance(
                      robotPairInfo[viewRobot.secondExchangePair.split(',')[1]],
                      robotBalance,
                      robotAccounts[viewRobot.secondExchangeAccountId],
                      exchange[viewRobot.secondExchangeId],
                      true
                    ) | filterVal
                  }}
                </span>
                <span v-else>
                  {{
                    robotPairInfo[viewRobot.secondExchangePair.split(',')[0]]
                      | filterSymbol(
                        exchange[viewRobot.secondExchangeId],
                        false
                      )
                  }}:
                  {{
                    filterBalance(
                      robotPairInfo[viewRobot.secondExchangePair.split(',')[0]],
                      robotBalance,
                      robotAccounts[viewRobot.secondExchangeAccountId],
                      exchange[viewRobot.secondExchangeId],
                      false
                    ) | filterVal
                  }}
                </span>
              </div>
            </div>
          </div>
          <span class="horizontal-line"></span>
        </div>
        <div class="mt20 flex-center">
          <span class="view-robot-label">Config:</span>
          <div v-if="robotTypeName[viewRobot.typeId] === 'Timer Robot'">
            <div v-if="getTimerConfig(viewRobot.arguments)">
              <div>
                {{ getTimerConfig(viewRobot.arguments).orderAmount }}
                {{
                  robotPairInfo[viewRobot.mainExchangePair]
                    | filterSymbol(exchange[viewRobot.mainExchangeId], true)
                }}
                per order
              </div>
              <div>
                Interval
                {{ getTimerConfig(viewRobot.arguments).interval }} minutes
              </div>
              <div>
                <span v-if="getTimerConfig(viewRobot.arguments).unilateral">
                  One-side
                </span>
                <span v-else>Two-sides</span>
                <span v-if="getTimerConfig(viewRobot.arguments).arbitrage">
                  , Arbitrage only
                </span>
              </div>
            </div>
          </div>
          <div v-if="robotTypeName[viewRobot.typeId] === 'Maker Robot'">
            <div v-if="getMakerConfig(viewRobot.arguments)">
              <div>
                {{ getMakerConfig(viewRobot.arguments).token1Amount }}
                {{
                  robotPairInfo[viewRobot.mainExchangePair]
                    | filterSymbol(exchange[viewRobot.mainExchangeId], false)
                }}
                per order
              </div>
              <div>
                Min profit
                {{ getMakerConfig(viewRobot.arguments).minimumProfit }}%
              </div>
              <div>
                Price fluctuation
                {{
                  getMakerConfig(viewRobot.arguments).minimumPriceFluctuation
                }}%
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
    <a-modal
      v-model="visibleErrors"
      centered
      width="90%"
      :footer="null"
      :keyboard="false"
      :maskClosable="false"
      :after-close="afterCloseError"
    >
      <a-spin
        :spinning="spinningOrdersError"
        class="exchange-main"
        style="margin-top: 40px"
      >
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Main Exchange</th>
              <th>OrderId</th>
              <th>Swap</th>
              <th class="table-line">Second Exchange</th>
              <th>Message</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in ordersError" :key="item.id">
              <td>{{ item.id }}</td>
              <td>
                {{ exchange[item.strategy.mainExchangeId] }}
              </td>
              <td>
                <a
                  v-if="exchange[item.strategy.mainExchangeId] === 'ICDex'"
                  :href="`https://ic.house/swap/${item.strategy.mainExchangePair}/${item.mainExchangeOrderId}`"
                  rel="nofollow noreferrer noopener"
                  target="_blank"
                >
                  <copy-account
                    :account="item.mainExchangeOrderId"
                    placement="left"
                    copy-text="txid"
                  ></copy-account>
                </a>
                <span v-else>
                  {{ item.mainExchangeOrderId }}
                </span>
              </td>
              <td>
                <div v-if="exchange[item.strategy.mainExchangeId] === 'ICDex'">
                  <div>
                    <div class="swap-info">
                      <div
                        v-if="item.mainExchangeOrderInfo"
                        class="flex-center"
                      >
                        <div
                          v-if="
                            filterSide(item.mainExchangeOrderInfo, 'ICDex') ===
                            'Sell'
                          "
                        >
                          {{
                            getSellToken0(
                              item.mainExchangeOrderInfo,
                              item.balanceChangesFilled,
                              robotPairInfo
                            )
                          }}
                          <span class="span-nbsp"></span
                          >{{
                            robotPairInfo[item.strategy.mainExchangePair]
                              | filterSymbol(
                                exchange[item.strategy.mainExchangeId],
                                true
                              )
                          }}
                        </div>
                        <div
                          v-if="
                            filterSide(item.mainExchangeOrderInfo, 'ICDex') ===
                            'Buy'
                          "
                        >
                          {{
                            getBuyToken1(
                              item.mainExchangeOrderInfo,
                              item.balanceChangesFilled,
                              robotPairInfo
                            )
                          }}
                          <span class="span-nbsp"></span
                          >{{
                            robotPairInfo[item.strategy.mainExchangePair]
                              | filterSymbol(
                                exchange[item.strategy.mainExchangeId],
                                false
                              )
                          }}
                        </div>
                        <span class="span-nbsp"></span>-><span
                          class="span-nbsp"
                        ></span>
                        <div
                          v-if="
                            filterSide(item.mainExchangeOrderInfo, 'ICDex') ===
                            'Sell'
                          "
                        >
                          {{
                            getSellToken1(
                              item.mainExchangeOrderInfo,
                              item.balanceChangesFilled,
                              robotPairInfo
                            )
                          }}
                          <span class="span-nbsp"></span
                          >{{
                            robotPairInfo[item.strategy.mainExchangePair]
                              | filterSymbol(
                                exchange[item.strategy.mainExchangeId],
                                false
                              )
                          }}
                        </div>
                        <div
                          v-if="
                            filterSide(item.mainExchangeOrderInfo, 'ICDex') ===
                            'Buy'
                          "
                        >
                          {{
                            getBuyToken0(
                              item.mainExchangeOrderInfo,
                              item.balanceChangesFilled,
                              robotPairInfo
                            )
                          }}
                          <span class="span-nbsp"></span
                          >{{
                            robotPairInfo[item.strategy.mainExchangePair]
                              | filterSymbol(
                                exchange[item.strategy.mainExchangeId],
                                true
                              )
                          }}
                        </div>
                      </div>
                      <div v-else>-</div>
                    </div>
                  </div>
                  <span class="line2 fs12" v-if="item.mainExchangeOrderInfo">
                    (price:
                    <span>
                      {{ getICDexPrice(item, robotPairInfo, exchange) }}</span
                    >)
                  </span>
                </div>
                <div
                  v-if="exchange[item.strategy.mainExchangeId] === 'Binance'"
                >
                  <div v-if="item.mainExchangeOrderInfo">
                    <div v-if="item.mainExchangeOrderInfo.side === 'SELL'">
                      <span>
                        {{ item.mainExchangeOrderInfo.executedQty | filterVal }}
                        {{
                          getBinanceSymbol(
                            item.mainExchangeOrderInfo.symbol,
                            robotPairInfo
                          ).base
                        }}
                        <span class="span-nbsp"></span>-><span
                          class="span-nbsp"
                        ></span>
                        {{
                          item.mainExchangeOrderInfo.cummulativeQuoteQty
                            | filterVal
                        }}
                        {{
                          getBinanceSymbol(
                            item.mainExchangeOrderInfo.symbol,
                            robotPairInfo
                          ).quote
                        }}
                      </span>
                    </div>
                    <div v-if="item.mainExchangeOrderInfo.side === 'BUY'">
                      <span>
                        {{
                          item.mainExchangeOrderInfo.cummulativeQuoteQty
                            | filterVal
                        }}
                        {{
                          getBinanceSymbol(
                            item.mainExchangeOrderInfo.symbol,
                            robotPairInfo
                          ).quote
                        }}
                        <span class="span-nbsp"></span>-><span
                          class="span-nbsp"
                        ></span>
                        {{ item.mainExchangeOrderInfo.executedQty | filterVal }}
                        {{
                          getBinanceSymbol(
                            item.mainExchangeOrderInfo.symbol,
                            robotPairInfo
                          ).base
                        }}
                      </span>
                    </div>
                  </div>
                  <span class="line2 fs12" v-if="item.mainExchangeOrderInfo">
                    (price:
                    <span>
                      {{ getBinancePrice(item, robotPairInfo, exchange) }}</span
                    >)
                  </span>
                </div>
              </td>
              <td class="table-line">
                {{ exchange[item.strategy.secondExchangeId] }}
              </td>
              <td class="fs12 fail-message">
                <div>{{ filterMessage(item) }}</div>
              </td>
              <td>{{ item.updateTime | formatDateToUTC }}</td>
            </tr>
            <tr v-if="!ordersError.length && !spinningOrdersError">
              <td colspan="7" align="center">
                <div>No order</div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pagination-bottom">
          <a-pagination
            v-if="totalOrderError > pageSizeOrderError"
            class="transactions-pagination"
            v-model="pageOrderError"
            :total="totalOrderError"
            :defaultPageSize="pageSizeOrderError"
            :showQuickJumper="true"
            @change="pageChangeOrderError"
          />
        </div>
      </a-spin>
    </a-modal>
    <withdraw-token
      v-if="currentPair"
      ref="withdrawToken"
      :pair-id="currentPair.pairId"
      :identity="currentIdentity"
      @withdrawSuccess="withdrawSuccess"
    >
    </withdraw-token>
    <transfer-token
      v-if="currentPair"
      ref="transferToken"
      :current-token="currentToken"
      :pair-id="currentPair.pairId"
      :is-token0="isToken0"
      :identity="currentIdentity"
      type="Deposit"
      transferButton="Deposit"
      @DepositSuccess="DepositSuccess"
    ></transfer-token>
  </div>
</template>
<script lang="ts">
import { Component, Mixins, Vue } from 'vue-property-decorator';
import {
  Account,
  AccountInfo,
  Assets,
  AvgPrice,
  BinanceSymbol,
  Depth,
  Exchange,
  ExchangeInfo,
  ExchangeName,
  MakerConfig,
  OrderRow,
  OrdersTable,
  PairPrice,
  Robot,
  RobotBinanceConfig,
  RobotICDexBalance,
  RobotICDexConfig,
  RobotICDexInfo,
  RobotName,
  RobotStatus,
  RobotType,
  StrategyParams,
  SwapTokenInfo,
  TimerConfig,
  TokenInfo,
  User
} from '@/views/home/model';
import SelectExchange from '@/views/home/components/SelectExchange.vue';
import {
  ValidationRule,
  WrappedFormUtils
} from 'ant-design-vue/types/form/form';
import { Level, PairInfo } from '@/ic/ICDex/model';
import { getTokenInfo } from '@/ic/getTokenInfo';
import BigNumber from 'bignumber.js';
import { PairsData } from '@/ic/ICSwapRouter/model';
import {
  fromSubAccountId,
  principalToAccountIdentifier,
  toHexString
} from '@/ic/converter';
import { ICDexService } from '@/ic/ICDex/ICDexService';
import { identityFromPem } from '@/ic/utils';
import { Principal } from '@dfinity/principal';
import { getTokenBalance } from '@/ic/getTokenBalance';
import WithdrawToken from '@/components/withdrawToken/Index.vue';
import TransferToken from '@/components/transferToken/Index.vue';
import { Identity } from '@dfinity/agent';
import { getFee } from '@/ic/getTokenFee';
import { ICDexOrderMixin } from '@/mixins';
import { EventSourcePolyfill } from 'event-source-polyfill';
import axios from 'axios';
const intervalTime = 5 * 1000;
let isRunning = false;
@Component({
  name: 'index',
  components: {
    SelectExchange,
    WithdrawToken,
    TransferToken
  },
  filters: {
    filterFee(val): string {
      if (val) {
        return new BigNumber(val).times(100).toString(10);
      }
      return '-';
    },
    filterWalterBalance(
      pair: RobotICDexInfo | BinanceSymbol,
      account: Account,
      robotICDexLocalBalance: {
        [account: string]: { [key: string]: string };
      },
      isToken0: boolean
    ): string {
      if (pair && robotICDexLocalBalance) {
        pair = pair as RobotICDexInfo;
        const value = JSON.parse(account.value) as RobotICDexConfig;
        if (value && value.pem) {
          const identity = identityFromPem(value.pem);
          const principal = identity.getPrincipal().toString();
          if (principal && robotICDexLocalBalance[principal]) {
            if (isToken0) {
              const token0 = JSON.parse(pair.token0) as SwapTokenInfo;
              return robotICDexLocalBalance[principal][token0[0].toString()];
            } else {
              const token1 = JSON.parse(pair.token1) as SwapTokenInfo;
              return robotICDexLocalBalance[principal][token1[0].toString()];
            }
          }
        }
      }
      return '-';
    },
    filterDepth(
      depth: Level | Depth,
      pair: RobotICDexInfo | BinanceSymbol,
      exchangeName: ExchangeName,
      type: 'ask' | 'bid',
      token1Unit: number
    ): string {
      if (depth && exchangeName) {
        if (exchangeName === ExchangeName.Binance) {
          const val = depth as Depth;
          if (type === 'ask') {
            if (val.asks && val.asks[0] && val.asks[0][0]) {
              return val.asks[0][0];
            } else {
              return '';
            }
          } else if (type === 'bid') {
            if (val.bids && val.bids[0] && val.bids[0][0]) {
              return val.bids[0][0];
            } else {
              return '';
            }
          }
        } else if (exchangeName === ExchangeName.ICDex) {
          const pairInfo = pair as RobotICDexInfo;
          if (pairInfo.token0Info && pairInfo.token1Info) {
            const token0Decimals = JSON.parse(pairInfo.token0Info).decimals;
            const token1Decimals = JSON.parse(pairInfo.token1Info).decimals;
            const val = depth as Level;
            const unitSize = val[0];
            if (type === 'ask') {
              if (val[1].ask.length) {
                return new BigNumber(val[1].ask[0].price.toString(10))
                  .div(10 ** token1Decimals)
                  .div(
                    new BigNumber(unitSize.toString(10)).div(
                      10 ** token0Decimals
                    )
                  )
                  .toFixed(token1Unit, 2);
              }
              return '-';
            } else if (type === 'bid') {
              if (val[1].bid.length) {
                return new BigNumber(val[1].bid[0].price.toString(10))
                  .div(10 ** token1Decimals)
                  .div(
                    new BigNumber(unitSize.toString(10)).div(
                      10 ** token0Decimals
                    )
                  )
                  .toFixed(token1Unit, 3);
              }
              return '-';
            }
          }
        }
      }
      return '';
    },
    filterPair(
      pair: RobotICDexInfo | BinanceSymbol,
      exchangeName: ExchangeName
    ): string {
      if (pair && exchangeName) {
        if (exchangeName === ExchangeName.Binance) {
          const pairInfo = pair as BinanceSymbol;
          return pairInfo.symbol;
        } else if (exchangeName === ExchangeName.ICDex) {
          const pairInfo = pair as RobotICDexInfo;
          if (pairInfo.token0Info && pairInfo.token1Info) {
            return `${JSON.parse(pairInfo.token0Info).symbol}/${
              JSON.parse(pairInfo.token1Info).symbol
            }`;
          }
        }
      }
      return '';
    },
    filterSymbol(
      pair: RobotICDexInfo | BinanceSymbol,
      exchangeName: ExchangeName,
      isToken0: boolean
    ): string {
      if (pair && exchangeName) {
        if (exchangeName === ExchangeName.Binance) {
          const pairInfo = pair as BinanceSymbol;
          if (isToken0) {
            return pairInfo.baseAsset;
          } else {
            return pairInfo.quoteAsset;
          }
        } else if (exchangeName === ExchangeName.ICDex) {
          const pairInfo = pair as RobotICDexInfo;
          if (pairInfo.token0Info && pairInfo.token1Info) {
            if (isToken0) {
              return JSON.parse(pairInfo.token0Info).symbol;
            } else {
              return JSON.parse(pairInfo.token1Info).symbol;
            }
          }
        }
      }
      return '';
    },
    filterVal(val: string): string {
      if (val) {
        let decimalsNum = 8;
        if (decimalsNum > 4 && new BigNumber(val).abs().gt(0.001)) {
          decimalsNum = 4;
        }
        return new BigNumber(val).decimalPlaces(decimalsNum, 1).toString(10);
      }
      return '';
    },
    filterPrice(
      price: string,
      pair: RobotICDexInfo | BinanceSymbol,
      exchangeName: ExchangeName
    ): string {
      if (exchangeName === ExchangeName.Binance) {
        return price;
      } else {
        const pairInfo = pair as RobotICDexInfo;
        if (pairInfo.token0Info && pairInfo.token1Info) {
          const token0Decimals = JSON.parse(pairInfo.token0Info).decimals;
          const token1Decimals = JSON.parse(pairInfo.token1Info).decimals;
          return new BigNumber(price)
            .times(10 ** token0Decimals)
            .div(10 ** token1Decimals)
            .toString(10);
        }
      }
      return '';
    }
  }
})
export default class extends Mixins(ICDexOrderMixin) {
  private rateLimitTime = 0;
  private timer = null;
  private ICDexService: ICDexService;
  private spinningConfig = false;
  private spinningExchange = false;
  private spinningOrders = false;
  private spinningOrdersError = false;
  private robots: Array<Robot> = [];
  private robotError: Robot = null;
  private robotPairInfo: { [key: string]: RobotICDexInfo | BinanceSymbol } = {};
  private robotDepth: { [key: string]: Level | Depth } = {};
  private robotStats: { [key: string]: PairPrice } = {};
  private robotBalance: {
    [account: string]: RobotICDexBalance | Array<Assets>;
  } = {};
  private robotICDexLocalBalance: {
    [account: string]: { [key: string]: string };
  } = {};
  private refreshBinanceBalanceLoading = false;
  private refreshBalanceLoading = false;
  private refreshBalanceTraderAccountLoading = false;
  private isToken0 = false;
  private currentToken: TokenInfo = null;
  private currentPair: RobotICDexInfo = null;
  private currentIdentity: Identity = null;
  private page = 1;
  private pageSize = 10;
  private total = 0;
  private robotType: Array<RobotType> = [];
  private robotTypeName: { [key: number]: RobotName } = {};
  private visible = false;
  private visibleErrors = false;
  private title = 'Add Robot';
  private visibleView = false;
  private titleView = '';
  private viewRobot: Robot = null;
  private type = 'Add';
  private updateIndex: number;
  private currentRobot: Robot;
  private disabledType = false;
  private selectedType = { id: undefined };
  private exchanges: Array<Exchange> = [];
  private mainExchanges: Array<Exchange> = [];
  private secondExchanges: Array<Exchange> = [];
  private exchange: { [key: number]: ExchangeName } = {};
  private mainExchangeId: number;
  private secondExchangeId: number;
  private mainPairId: string = null;
  private mainPairInfo: PairInfo | BinanceSymbol = null;
  private mainAccount: number;
  private secondPairId: string = null;
  private secondPairInfo: PairInfo | BinanceSymbol = null;
  private secondPairIdTwo: string = null;
  private secondPairTwoInfo: PairInfo | BinanceSymbol = null;
  private secondAccount: number;
  private mainFee: string;
  private secondFee: string;
  private ICDexAccounts: Array<Account> = [];
  private BinanceAccounts: Array<Account> = [];
  private robotAccounts: { [key: number]: Account } = {};
  private disabledSelectedExchange = true;
  private disabledSelectedMainExchange = false;
  private invert = 0;
  private orders: Array<OrderRow> = [];
  private pageOrder = 1;
  private pageSizeOrder = 10;
  private totalOrder = 0;
  private ordersError: Array<OrderRow> = [];
  private pageOrderError = 1;
  private pageSizeOrderError = 10;
  private totalOrderError = 0;
  private configForm = {
    orderAmount: '',
    interval: '',
    arbitrage: false,
    unilateral: false
  };
  private configFormRules = {
    orderAmount: [
      {
        required: true,
        message: 'Please enter order amount.',
        trigger: ['blur', 'change']
      },
      { validator: this.validateAmountToken0, trigger: ['blur', 'change'] }
    ],
    interval: [
      {
        required: true,
        message: 'Please enter interval',
        trigger: ['blur', 'change']
      }
    ]
  };
  private configFormMaker = {
    token1Amount: '',
    gridSpread: '1',
    minimumProfit: '',
    minimumPriceFluctuation: ''
  };
  private configFormMakerRules = {
    token1Amount: [
      {
        required: true,
        message: 'Please enter amount per maker',
        trigger: ['blur', 'change']
      },
      { validator: this.validateAmountToken1, trigger: ['blur', 'change'] }
    ],
    // gridSpread: [
    //   {
    //     required: true,
    //     message: 'Please enter grid spread',
    //     trigger: ['blur', 'change']
    //   },
    //   {
    //     validator: this.validateGridSpread,
    //     trigger: ['blur', 'change']
    //   }
    // ],
    minimumProfit: [
      {
        required: true,
        message: 'Please enter minimumProfit',
        trigger: ['blur', 'change']
      },
      {
        validator: this.validateMinimumProfit,
        trigger: ['blur', 'change']
      }
    ],
    minimumPriceFluctuation: [
      {
        required: true,
        message: 'Please enter minimumProfit',
        trigger: ['blur', 'change']
      },
      {
        validator: this.validateMinimumPriceFluctuation,
        trigger: ['blur', 'change']
      }
    ]
  };
  private validateMinimumProfit(
    rule: ValidationRule,
    value: number,
    callback: (arg0?: string) => void
  ): void {
    if (value) {
      if (value && new BigNumber(value).lt(0.01)) {
        callback(`minimum profit must be greater than than ${0.01}`);
      } else {
        callback();
      }
    } else {
      callback();
    }
  }
  private validateMinimumPriceFluctuation(
    rule: ValidationRule,
    value: number,
    callback: (arg0?: string) => void
  ): void {
    if (this.configFormMaker.minimumProfit) {
      // 0.2-0.6
      const max = new BigNumber(this.configFormMaker.minimumProfit)
        .times(0.6)
        .decimalPlaces(3, 1)
        .toString(10);
      const min = new BigNumber(this.configFormMaker.minimumProfit)
        .times(0.2)
        .decimalPlaces(3, 1)
        .toString(10);
      if (
        value &&
        (new BigNumber(value).gt(max) || new BigNumber(value).lt(min))
      ) {
        callback(`The price % change should be between ${min} and ${max}.`);
      } else {
        callback();
      }
    } else {
      callback();
    }
  }
  private validateAmountToken1(
    rule: ValidationRule,
    value: number,
    callback: (arg0?: string) => void
  ): void {
    if (this.invert && this.exchange[this.secondExchangeId] === 'Binance') {
      const token0MinQty = new BigNumber(this.token0MinQty)
        .times(2)
        .toString(10);
      if (
        this.mainPairInfo &&
        this.token0MinQty &&
        value &&
        new BigNumber(value).lt(token0MinQty)
      ) {
        callback(`Min amount is ${token0MinQty} ${this.configToken1}`);
      } else {
        callback();
      }
    } else {
      const token1MinQty = new BigNumber(this.token1MinQty)
        .times(2)
        .toString(10);
      if (
        this.mainPairInfo &&
        this.token1MinQty &&
        value &&
        new BigNumber(value).lt(token1MinQty)
      ) {
        callback(`Min amount is ${token1MinQty} ${this.configToken1}`);
      } else {
        callback();
      }
    }
  }
  private ICDexPairs: Array<PairsData> = [];
  private binancePairs: ExchangeInfo = null;
  private tokenInfo: { [key: string]: TokenInfo } = {};
  private eventSourceTrade: EventSource = null;
  private eventSourceError: EventSource = null;
  private filterRobot = { id: 'all' };
  get token0MinQty(): number {
    let token0MinQty = '0';
    if (this.mainPairInfo && this.secondPairInfo) {
      if (this.exchange[this.mainExchangeId] === ExchangeName.Binance) {
        const pairInfo = this.mainPairInfo as BinanceSymbol;
        pairInfo.filters.forEach((filter) => {
          if (filter.filterType === 'LOT_SIZE') {
            token0MinQty = filter.minQty;
          }
        });
      }
      if (this.exchange[this.secondExchangeId] === ExchangeName.Binance) {
        const pairInfo = this.secondPairInfo as BinanceSymbol;
        pairInfo.filters.forEach((filter) => {
          if (filter.filterType === 'LOT_SIZE') {
            token0MinQty = filter.minQty;
          }
        });
      }
      return Number(token0MinQty);
    }
    return 0;
  }
  get token1MinQty(): number {
    let token1MinQty = '0';
    if (this.mainPairInfo && this.secondPairInfo) {
      if (this.exchange[this.mainExchangeId] === ExchangeName.Binance) {
        const pairInfo = this.mainPairInfo as BinanceSymbol;
        pairInfo.filters.forEach((filter) => {
          if (filter.filterType === 'NOTIONAL') {
            token1MinQty = filter.minNotional;
          }
        });
      }
      if (this.exchange[this.secondExchangeId] === ExchangeName.Binance) {
        const pairInfo = this.secondPairInfo as BinanceSymbol;
        pairInfo.filters.forEach((filter) => {
          if (filter.filterType === 'NOTIONAL') {
            token1MinQty = filter.minNotional;
          }
        });
      }
      return Number(token1MinQty);
    }
    return 0;
  }
  get token0Unit(): number {
    let mainToken0Unit = 8;
    let secondToken0Unit = 8;
    if (this.mainPairInfo && this.secondPairInfo) {
      if (this.exchange[this.mainExchangeId] === ExchangeName.ICDex) {
        const pairInfo = this.mainPairInfo as PairInfo;
        const token0 = pairInfo.token0[0].toString();
        if (this.tokenInfo[token0] || pairInfo.token0Info) {
          const token0Info = this.tokenInfo[token0] || pairInfo.token0Info;
          const tokenUnitDecimals =
            pairInfo.setting.UNIT_SIZE.toString().length - 1; // Unit must 1+0000
          if (token0Info.decimals > tokenUnitDecimals) {
            mainToken0Unit = token0Info.decimals - tokenUnitDecimals;
          } else {
            mainToken0Unit = 0;
          }
        }
      } else if (this.exchange[this.mainExchangeId] === ExchangeName.Binance) {
        mainToken0Unit = (this.mainPairInfo as BinanceSymbol)
          .baseAssetPrecision;
      }
      if (this.exchange[this.secondExchangeId] === ExchangeName.ICDex) {
        const pairInfo = this.secondPairInfo as PairInfo;
        if (this.invert) {
          const token1 = pairInfo.token1[0].toString();
          if (this.tokenInfo[token1] || pairInfo.token1Info) {
            const token1Info = this.tokenInfo[token1] || pairInfo.token1Info;
            secondToken0Unit = token1Info.decimals;
          }
        } else {
          const token0 = pairInfo.token0[0].toString();
          if (this.tokenInfo[token0] || pairInfo.token0Info) {
            const token0Info = this.tokenInfo[token0] || pairInfo.token0Info;
            const tokenUnitDecimals =
              pairInfo.setting.UNIT_SIZE.toString().length - 1; // Unit must 1+0000
            if (token0Info.decimals > tokenUnitDecimals) {
              secondToken0Unit = token0Info.decimals - tokenUnitDecimals;
            } else {
              secondToken0Unit = 0;
            }
          }
        }
      } else if (
        this.exchange[this.secondExchangeId] === ExchangeName.Binance
      ) {
        if (this.invert) {
          secondToken0Unit = (this.secondPairInfo as BinanceSymbol)
            .quoteAssetPrecision;
        } else {
          secondToken0Unit = (this.secondPairInfo as BinanceSymbol)
            .baseAssetPrecision;
        }
      }
      return Math.min(mainToken0Unit, secondToken0Unit);
    }
    return 8;
  }
  get token1Unit(): number {
    let mainToken1Unit = 8;
    let secondToken0Unit = 8;
    if (this.mainPairInfo && this.secondPairInfo) {
      if (this.exchange[this.mainExchangeId] === ExchangeName.ICDex) {
        const pairInfo = this.mainPairInfo as PairInfo;
        if (
          this.tokenInfo[pairInfo.token1[0].toString()] ||
          pairInfo.token1Info
        ) {
          const token1Info =
            this.tokenInfo[pairInfo.token1[0].toString()] ||
            pairInfo.token1Info;
          mainToken1Unit = token1Info.decimals;
        }
      }
      if (this.exchange[this.mainExchangeId] === ExchangeName.Binance) {
        const pairInfo = this.mainPairInfo as BinanceSymbol;
        mainToken1Unit = pairInfo.quoteAssetPrecision;
      }
      if (!this.secondPairTwoInfo) {
        if (this.exchange[this.secondExchangeId] === ExchangeName.Binance) {
          const pairInfo = this.secondPairInfo as BinanceSymbol;
          if (this.invert) {
            secondToken0Unit = pairInfo.baseAssetPrecision;
          } else {
            secondToken0Unit = pairInfo.quoteAssetPrecision;
          }
        }
        if (this.exchange[this.secondExchangeId] === ExchangeName.ICDex) {
          const pairInfo = this.secondPairInfo as PairInfo;
          if (this.invert) {
            const token0 = pairInfo.token0[0].toString();
            if (this.tokenInfo[token0] || pairInfo.token0Info) {
              const token0Info = this.tokenInfo[token0] || pairInfo.token0Info;
              const tokenUnitDecimals =
                pairInfo.setting.UNIT_SIZE.toString().length - 1; // Unit must 1+0000
              if (token0Info.decimals > tokenUnitDecimals) {
                mainToken1Unit = token0Info.decimals - tokenUnitDecimals;
              } else {
                mainToken1Unit = 0;
              }
            }
          } else {
            if (this.tokenInfo[pairInfo.token1[0].toString()]) {
              const token1Info =
                this.tokenInfo[pairInfo.token1[0].toString()] ||
                pairInfo.token1Info;
              mainToken1Unit = token1Info.decimals;
            }
          }
        }
      } else {
        if (this.exchange[this.secondExchangeId] === ExchangeName.Binance) {
          const pairInfo = this.secondPairTwoInfo as BinanceSymbol;
          if (this.invert) {
            secondToken0Unit = pairInfo.quoteAssetPrecision;
          } else {
            secondToken0Unit = pairInfo.baseAssetPrecision;
          }
        }
        if (this.exchange[this.secondExchangeId] === ExchangeName.ICDex) {
          const pairInfo = this.secondPairTwoInfo as PairInfo;
          if (this.invert) {
            const token0 = pairInfo.token0[0].toString();
            if (this.tokenInfo[token0] || pairInfo.token0Info) {
              const token0Info = this.tokenInfo[token0] || pairInfo.token0Info;
              const tokenUnitDecimals =
                pairInfo.setting.UNIT_SIZE.toString().length - 1; // Unit must 1+0000
              if (token0Info.decimals > tokenUnitDecimals) {
                mainToken1Unit = token0Info.decimals - tokenUnitDecimals;
              } else {
                mainToken1Unit = 0;
              }
            }
          } else {
            if (
              this.tokenInfo[pairInfo.token0[0].toString()] ||
              pairInfo.token0Info
            ) {
              const token0Info =
                this.tokenInfo[pairInfo.token0[0].toString()] ||
                pairInfo.token0Info;
              mainToken1Unit = token0Info.decimals;
            }
          }
        }
      }
    }
    return Math.min(mainToken1Unit, secondToken0Unit);
  }
  get configToken1(): string {
    if (this.mainPairInfo) {
      if (this.exchange[this.mainExchangeId] === ExchangeName.ICDex) {
        return (this.mainPairInfo as PairInfo).token1[1];
      } else if (this.exchange[this.mainExchangeId] === ExchangeName.Binance) {
        return (this.mainPairInfo as BinanceSymbol).quoteAsset;
      }
    }
    return '';
  }
  get timerToken0(): string {
    if (this.mainPairInfo) {
      if (this.exchange[this.mainExchangeId] === ExchangeName.ICDex) {
        return (this.mainPairInfo as PairInfo).token0[1];
      } else if (this.exchange[this.mainExchangeId] === ExchangeName.Binance) {
        return (this.mainPairInfo as BinanceSymbol).baseAsset;
      }
    }
    return '';
  }
  beforeDestroy(): void {
    window.clearTimeout(this.timer);
    this.timer = null;
    // window.clearTimeout(this.timerBalance);
    // this.timerBalance = null;
    // window.clearTimeout(this.timerDepth);
    // this.timerDepth = null;
    // this.closeEvent();
    // EventBus.$off(['getRunning']);
  }
  mounted(): void {
    window.addEventListener('beforeunload', () => {
      this.closeEvent();
    });
  }
  beforeUnmount(): void {
    this.closeEvent();
  }
  private closeEvent(): void {
    try {
      if (this.eventSourceTrade) {
        this.eventSourceTrade.close();
      }
      if (this.eventSourceError) {
        this.eventSourceError.close();
      }
    } catch (e) {
      //
    }
  }
  created(): void {
    this.ICDexService = new ICDexService();
    this.getExchanges();
    this.getRobotType();
  }
  private validateAmountToken0(
    rule: ValidationRule,
    value: number,
    callback: (arg0?: string) => void
  ): void {
    if (this.invert && this.exchange[this.secondExchangeId] === 'Binance') {
      let token1MinQty = new BigNumber(this.token1MinQty).times(2).toString(10);
      const token0MinICDex = new BigNumber(1)
        .div(10 ** this.token1Unit)
        .times(2)
        .toString(10);
      if (new BigNumber(token1MinQty).lt(token0MinICDex)) {
        token1MinQty = token0MinICDex;
      }
      if (
        this.mainPairInfo &&
        this.token1MinQty &&
        value &&
        new BigNumber(value).lt(token1MinQty)
      ) {
        callback(`Min amount is ${token1MinQty} ${this.timerToken0}`);
      } else {
        callback();
      }
    } else {
      let token0MinQty = new BigNumber(this.token0MinQty).times(2).toString(10);
      const token0MinICDex = new BigNumber(1)
        .div(10 ** this.token0Unit)
        .times(2)
        .toString(10);
      if (new BigNumber(token0MinQty).lt(token0MinICDex)) {
        token0MinQty = token0MinICDex;
      }
      if (
        this.mainPairInfo &&
        this.token0MinQty &&
        value &&
        new BigNumber(value).lt(token0MinQty)
      ) {
        callback(`Min amount is ${token0MinQty} ${this.timerToken0}`);
      } else {
        callback();
      }
    }
  }
  private infoInterval(): void {
    window.clearTimeout(this.timer);
    this.timer = null;
    this.timer = window.setTimeout(async () => {
      this.getExchanges();
      for (let account in this.robotICDexLocalBalance) {
        for (let tokenId in this.robotICDexLocalBalance[account]) {
          this.getLocalTokenBalance(account, tokenId, this.tokenInfo[tokenId]);
        }
      }
      for (let account in this.robotBalance) {
        if (!Array.isArray(this.robotBalance[account])) {
          for (let pairId in this.robotBalance[account]) {
            this.getAccountBalance(pairId, account);
          }
        }
      }
      // this.tradeOfBinanceTest();
    }, 1000 * 60);
  }
  private verify(): boolean {
    if (!this.selectedType.id) {
      this.$message.error('Please select robot type');
      return false;
    }
    if (!this.mainExchangeId) {
      this.$message.error('Please select main exchange');
      return false;
    }
    if (!this.mainPairInfo) {
      this.$message.error('Please select main exchange pair');
      return false;
    }
    if (!this.mainAccount) {
      this.$message.error('Please select main exchange account');
      return false;
    }
    if (!this.mainFee) {
      this.$message.error('Please enter main exchange fee');
      return false;
    }
    if (!this.secondExchangeId) {
      this.$message.error('Please select second exchange');
      return false;
    }
    if (!this.secondPairInfo) {
      this.$message.error('Please select second exchange pair');
      return false;
    }
    if (!this.secondAccount) {
      this.$message.error('Please select second exchange account');
      return false;
    }
    if (!this.secondFee) {
      this.$message.error('Please enter second exchange fee');
      return false;
    }
    if (this.type === 'Add') {
      if (this.exchange[this.mainExchangeId] === ExchangeName.ICDex) {
        const pairInfo = this.mainPairInfo as PairInfo;
        const token0Info =
          this.tokenInfo[pairInfo.token0[0].toString()] || pairInfo.token0Info;
        const token1Info =
          this.tokenInfo[pairInfo.token1[0].toString()] || pairInfo.token1Info;
        const token0Symbol = token0Info.symbol;
        const token1Symbol = token1Info.symbol;
        const token0 = token0Symbol.replace(/^(ck|ic)/, '').toLocaleUpperCase();
        const token1 = token1Symbol.replace(/^(ck|ic)/, '').toLocaleUpperCase();
        const symbol = `${token0}${token1}`;
        // const binanceSymbol = this.filterBinanceSymbol(symbol);
        if (this.exchange[this.secondExchangeId] === ExchangeName.Binance) {
          let secondSymbol = '';
          const secondPairInfo = this.secondPairInfo as BinanceSymbol;
          const secondPairTwoInfo = this.secondPairTwoInfo as BinanceSymbol;
          if (!this.secondPairTwoInfo) {
            secondSymbol = secondPairInfo.symbol;
          } else {
            secondSymbol = `${secondPairInfo.baseAsset}${secondPairTwoInfo.baseAsset}`;
            if (this.secondPairTwoInfo) {
              const quoteAssetSecond = secondPairInfo.quoteAsset;
              const quoteAssetSecondTwo = secondPairTwoInfo.quoteAsset;
              const regex = /(USDT|USDC|BTC|ETH)$/i;
              if (
                !(
                  regex.test(quoteAssetSecond) &&
                  regex.test(quoteAssetSecondTwo)
                )
              ) {
                this.$message.error(
                  'The quotes of the pairs must be USDT or USDC or BTC or ETH'
                );
                return;
              }
              if (
                (quoteAssetSecond.endsWith('USDT') &&
                  !quoteAssetSecondTwo.endsWith('USDT')) ||
                (quoteAssetSecond.endsWith('USDC') &&
                  !quoteAssetSecondTwo.endsWith('USDC')) ||
                (quoteAssetSecond.endsWith('BTC') &&
                  !quoteAssetSecondTwo.endsWith('BTC')) ||
                (quoteAssetSecond.endsWith('ETH') &&
                  !quoteAssetSecondTwo.endsWith('ETH'))
              ) {
                this.$message.error('The quotes of the pairs must be the same');
                return false;
              }
            }
          }
          if (symbol !== secondSymbol) {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const that = this;
            this.$confirm({
              content:
                'You may have populated an unrelated pair. Are you sure you want to add strategy?',
              class: 'connect-plug message-info',
              centered: true,
              okText: 'Confirm',
              onOk() {
                if (
                  that.robotTypeName[that.selectedType.id] === RobotName.Timer
                ) {
                  that.confirmTimer();
                } else if (
                  that.robotTypeName[that.selectedType.id] === RobotName.Maker
                ) {
                  that.confirmMaker();
                }
              }
            });
            return false;
          }
        }
      } else if (this.exchange[this.mainExchangeId] === ExchangeName.Binance) {
        const pairInfo = this.mainPairInfo as BinanceSymbol;
        const symbol = pairInfo.symbol;
        if (this.exchange[this.secondExchangeId] === ExchangeName.ICDex) {
          let secondSymbol = '';
          const secondPairInfo = this.secondPairInfo as PairInfo;
          const secondPairTwoInfo = this.secondPairTwoInfo as PairInfo;
          if (!this.secondPairTwoInfo) {
            secondSymbol = `${secondPairInfo.token0[1]
              .replace(/^(ck|ic)/, '')
              .toLocaleUpperCase()}${secondPairInfo.token1[1]
              .replace(/^(ck|ic)/, '')
              .toLocaleUpperCase()}`;
          } else {
            secondSymbol = `${secondPairInfo.token0[1]
              .replace(/^(ck|ic)/, '')
              .toLocaleUpperCase()}${secondPairTwoInfo.token0[1]
              .replace(/^(ck|ic)/, '')
              .toLocaleUpperCase()}`;
            if (this.secondPairTwoInfo) {
              const quoteAssetSecond = secondPairInfo.token1[1]
                .replace(/^(ck|ic)/, '')
                .toLocaleUpperCase();
              const quoteAssetSecondTwo = secondPairTwoInfo.token1[1]
                .replace(/^(ck|ic)/, '')
                .toLocaleUpperCase();
              const regex = /(USDT|USDC|BTC|ETH)$/i;
              if (
                !(
                  regex.test(quoteAssetSecond) &&
                  regex.test(quoteAssetSecondTwo)
                )
              ) {
                this.$message.error(
                  'The quotes of the pairs must be USDT or USDC or BTC or ETH'
                );
                return;
              }
              if (
                (quoteAssetSecond.endsWith('USDT') &&
                  !quoteAssetSecondTwo.endsWith('USDT')) ||
                (quoteAssetSecond.endsWith('USDC') &&
                  !quoteAssetSecondTwo.endsWith('USDC')) ||
                (quoteAssetSecond.endsWith('BTC') &&
                  !quoteAssetSecondTwo.endsWith('BTC')) ||
                (quoteAssetSecond.endsWith('ETH') &&
                  !quoteAssetSecondTwo.endsWith('ETH'))
              ) {
                this.$message.error('The quotes of the pairs must be the same');
                return false;
              }
            }
          }
          if (symbol !== secondSymbol) {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const that = this;
            this.$confirm({
              content:
                'You may have populated an unrelated pair. Are you sure you want to add strategy?',
              class: 'connect-plug message-info',
              centered: true,
              okText: 'Confirm',
              onOk() {
                if (
                  that.robotTypeName[that.selectedType.id] === RobotName.Timer
                ) {
                  that.confirmTimer();
                } else if (
                  that.robotTypeName[that.selectedType.id] === RobotName.Maker
                ) {
                  that.confirmMaker();
                }
              }
            });
            return false;
          }
        }
      }
    }
    return true;
  }
  private filterBinanceSymbol(symbol: string): string {
    if (symbol) {
      const binanceSymbol = this.binancePairs.symbols.find((item) => {
        return symbol === item.symbol;
      });
      if (binanceSymbol) {
        return binanceSymbol.symbol;
      }
      return '';
    }
    return '';
  }
  private getICDexPairs(ICDexPairs: Array<PairsData>): void {
    this.ICDexPairs = ICDexPairs;
  }
  private getBinancePairs(binancePairs: ExchangeInfo): void {
    this.binancePairs = binancePairs;
  }
  private submitMaker(): void {
    if (this.type === 'Add') {
      (this.$refs.configFormMaker as Vue & { validate: any }).validate(
        async (valid: any) => {
          if (valid) {
            const verifyParams = this.verify();
            if (!verifyParams) {
              return;
            }
            this.confirmMaker();
          }
        }
      );
    } else {
      (this.$refs.configFormMaker as Vue & { validate: any }).validate(
        async (valid: any) => {
          if (valid) {
            const verifyParams = this.verify();
            if (!verifyParams) {
              return;
            }
            this.confirmMaker();
          }
        }
      );
      // const verifyParams = this.verify();
      // 
    }
  }
  private async confirmMaker(): Promise<void> {
    if (this.invert && this.exchange[this.secondExchangeId] === 'Binance') {
      const binanceInfo = this.secondPairInfo as BinanceSymbol;
      let flag = true;
      if (binanceInfo) {
        let symbolMinNotional = '0';
        const avgPrice = await this.getAvgPrice(binanceInfo.symbol);
        if (avgPrice) {
          binanceInfo.filters.forEach((filter) => {
            if (flag) {
              if (filter.filterType === 'NOTIONAL') {
                symbolMinNotional = filter.minNotional;
                if (symbolMinNotional) {
                  const minToken0 = new BigNumber(symbolMinNotional)
                    .div(avgPrice.price)
                    .times(2)
                    .toString(10);
                  if (
                    new BigNumber(this.configFormMaker.token1Amount).lt(
                      minToken0
                    )
                  ) {
                    this.$message.error(
                      `Min amount is ${minToken0} ${this.configToken1}`
                    );
                    flag = false;
                  }
                }
              }
            }
          });
        }
      }
      if (!flag) {
        return;
      }
    }
    if (this.type === 'Add') {
      this.addStrategy(JSON.stringify(this.configFormMaker));
    } else {
      this.updateConfig(JSON.stringify(this.configFormMaker));
    }
  }
  private submitTimer(): void {
    if (this.type === 'Add') {
      (this.$refs.configForm as Vue & { validate: any }).validate(
        async (valid: any) => {
          if (valid) {
            const verifyParams = this.verify();
            if (!verifyParams) {
              return;
            }
            this.confirmTimer();
          }
        }
      );
    } else {
      const verifyParams = this.verify();
      if (!verifyParams) {
        return;
      }
      this.confirmTimer();
    }
  }
  private async confirmTimer(): Promise<void> {
    this.spinningConfig = true;
    let binanceInfo: BinanceSymbol;
    if (this.exchange[this.mainExchangeId] === ExchangeName.Binance) {
      binanceInfo = this.mainPairInfo as BinanceSymbol;
    }
    if (this.exchange[this.secondExchangeId] === ExchangeName.Binance) {
      binanceInfo = this.secondPairInfo as BinanceSymbol;
    }
    let flag = true;
    if (binanceInfo) {
      let symbolMinNotional = '0';
      if (!this.invert) {
        const avgPrice = await this.getAvgPrice(binanceInfo.symbol);
        if (avgPrice) {
          binanceInfo.filters.forEach((filter) => {
            if (flag) {
              if (filter.filterType === 'NOTIONAL') {
                symbolMinNotional = filter.minNotional;
                if (symbolMinNotional) {
                  const minToken0 = new BigNumber(symbolMinNotional)
                    .div(avgPrice.price)
                    .times(2)
                    .toString(10);
                  if (
                    new BigNumber(this.configForm.orderAmount).lt(minToken0)
                  ) {
                    this.$message.error(
                      `Min amount is ${minToken0} ${this.timerToken0}`
                    );
                    this.spinningConfig = false;
                    flag = false;
                  }
                }
              }
            }
          });
        }
      }
    }
    if (!flag) {
      return;
    }
    if (this.type === 'Add') {
      this.addStrategy(
        JSON.stringify(
          Object.assign({}, this.configForm, {
            arbitrage: this.configForm.arbitrage ? 1 : 0,
            unilateral: this.configForm.unilateral ? 1 : 0
          })
        )
      );
    } else {
      this.updateConfig(
        JSON.stringify(
          Object.assign({}, this.configForm, {
            arbitrage: this.configForm.arbitrage ? 1 : 0,
            unilateral: this.configForm.unilateral ? 1 : 0
          })
        )
      );
    }
  }
  private async addStrategy(argumentsAdd: string): Promise<void> {
    try {
      const mainPairInfo = this.initPairInfo(
        this.exchange[this.mainExchangeId],
        this.mainPairId,
        this.mainPairInfo
      );
      const secondPairInfo = this.initPairInfo(
        this.exchange[this.secondExchangeId],
        this.secondPairId,
        this.secondPairInfo
      );
      const secondPairTwoInfo = this.initPairInfo(
        this.exchange[this.secondExchangeId],
        this.secondPairIdTwo,
        this.secondPairTwoInfo
      );
      const strategyParams: StrategyParams = {
        typeId: this.selectedType.id,
        mainExchangeId: this.mainExchangeId,
        mainExchangeName: this.exchange[this.mainExchangeId],
        mainExchangePair: this.mainPairId,
        mainPairInfo: mainPairInfo,
        mainExchangeAccountId: this.mainAccount,
        secondExchangeName: this.exchange[this.secondExchangeId],
        secondExchangeId: this.secondExchangeId,
        secondPairInfo: secondPairInfo,
        secondExchangePair: this.secondPairId,
        secondExchangePairTwo: this.secondPairIdTwo,
        secondPairTwoInfo: secondPairTwoInfo,
        secondExchangeAccountId: this.secondAccount,
        mainFee: new BigNumber(this.mainFee).div(100).toString(10),
        secondFee: new BigNumber(this.secondFee).div(100).toString(10),
        invert: this.invert
      };
      const res = await this.$axios.post(
        'addStrategy',
        Object.assign(
          {},
          { config: argumentsAdd },
          { strategyParams: strategyParams }
        )
      );
      if (res && res.status === 200) {
        this.$message.success('Add strategy success');
      } else {
        this.$message.error('Error');
      }
    } catch (e) {
      console.error(e);
      this.$message.error('Error');
    }
    await this.getAccounts();
    await this.getRobots();
    this.visible = false;
    this.spinningConfig = false;
  }
  private async updateConfig(config: string): Promise<void> {
    this.spinningConfig = true;
    try {
      const res = await this.$axios.post('updateStrategyConfig', {
        id: this.currentRobot.id,
        config: config
      });
      if (res && res.status === 200) {
        this.$message.success('Update strategy success');
      }
    } catch (e) {
      console.error(e);
      this.$message.error('Error');
    }
    this.$set(this.robots[this.updateIndex], 'arguments', config);
    this.visible = false;
    this.spinningConfig = false;
  }
  private showView(item: Robot): void {
    this.viewRobot = item;
    this.visibleView = true;
  }
  private async showStop(item: Robot, index: number): Promise<void> {
    this.spinningExchange = true;
    try {
      const res = await this.$axios.post('stopStrategy', {
        strategyId: item.id
      });
      if (res && res.status === 200) {
        const robotRes = await this.$axios.get('getStrategy', {
          params: {
            id: item.id
          }
        });
        if (robotRes && robotRes.status === 200) {
          this.$set(this.robots[index], 'status', robotRes.data.status);
        }
        this.getOrders();
        this.$message.success('Stop strategy success');
      } else {
        this.$message.error('Error');
      }
    } catch (e) {
      this.$message.error('Error');
    }
    this.spinningExchange = false;
  }
  private async showRun(
    item: Robot,
    index: number,
    robotName: RobotName,
    config: string,
    pair: RobotICDexInfo | BinanceSymbol,
    robotBalance: {
      [key: string]: RobotICDexBalance | Array<Assets>;
    },
    account: Account,
    exchangeName: ExchangeName
  ): Promise<void> {
    this.spinningExchange = true;
    try {
      if (
        this.insufficientBalance(
          robotName,
          config,
          pair,
          robotBalance,
          account,
          exchangeName
        )
      ) {
        this.$message.error('Insufficient Balance');
        this.spinningExchange = false;
        return;
      }
      const res = await this.$axios.post('runStrategy', {
        strategyId: item.id
      });
      if (res && res.status === 200) {
        const robotRes = await this.$axios.get('getStrategy', {
          params: {
            id: item.id
          }
        });
        if (robotRes && robotRes.status === 200) {
          this.$set(this.robots[index], 'status', robotRes.data.status);
        }
        this.$message.success('Run strategy success');
      } else {
        this.$message.error('Error');
      }
    } catch (e) {
      this.$message.error('Error');
    }
    this.spinningExchange = false;
  }
  private async initSSEError(): Promise<void> {
    if (this.eventSourceError) {
      this.eventSourceError.close();
    }
    const user = await this.getUser();
    const username = user.userName;
    const password = user.password;
    const token = btoa(`${username}:${password}`);
    this.eventSourceError = new EventSourcePolyfill(
      `http://localhost:26535/events`,
      {
        headers: {
          Authorization: `Basic ${token}`
        }
      }
    );
    this.eventSourceError.onmessage = (event) => {
    };
    this.eventSourceError.onopen = () => {
      //
    };
    this.eventSourceError.onerror = (error) => {
      console.error('eventSourceError failed:', error);
      this.eventSourceError.close();
      setTimeout(() => this.initSSEError(), 5000);
    };
  }
  private async getUser(): Promise<User | null> {
    const res = await axios.get('http://localhost:26535/getUser');
    if (res.status === 200) {
      return res.data;
    }
  }
  private async initSSETrade(): Promise<void> {
    if (this.eventSourceTrade) {
      this.eventSourceTrade.close();
    }
    const user = await this.getUser();
    const username = user.userName;
    const password = user.password;
    const token = btoa(`${username}:${password}`);
    this.eventSourceTrade = new EventSourcePolyfill(
      `http://localhost:26535/events?type=Trade`,
      {
        headers: {
          Authorization: `Basic ${token}`
        }
      }
    );
    this.eventSourceTrade.onmessage = (event) => {
      this.getOrders();
    };
    this.eventSourceTrade.onopen = () => {
      //
    };
    this.eventSourceTrade.onerror = (error) => {
      console.error('eventSourceTrade failed:', error);
      this.eventSourceTrade.close();
      setTimeout(() => this.initSSETrade(), 5000);
    };
  }
  private async deleteRobot(item: Robot): Promise<void> {
    if (item.status === RobotStatus.Running) {
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      const that = this;
      this.$confirm({
        content: 'Are you sure you want to delete the strategy?',
        class: 'connect-plug message-info',
        centered: true,
        okText: 'Confirm',
        onOk() {
          that.spinningExchange = false;
          that.$axios
            .post('deleteStrategy', {
              strategyId: item.id
            })
            .then((res) => {
              if (res && res.status === 200) {
                that.$message.success('Delete strategy success');
                that.pageOrder = 1;
                that.pageSizeOrder = 10;
                that.totalOrder = 0;
                that.getRobots().then(() => {
                  that.getOrders();
                });
              } else {
                that.$message.error('Error');
              }
            })
            .finally(() => {
              that.spinningExchange = false;
            });
        }
      });
    } catch (e) {
      this.$message.error('Error');
    }
  }
  private showUpdateConfig(item: Robot, index: number): void {
    if (item.status === RobotStatus.Running) {
      return;
    }
    this.visible = true;
    this.title = 'Update Config';
    this.type = 'Update';
    this.updateIndex = index;
    this.currentRobot = item;
    this.invert = item.invert;
    this.selectedType.id = item.typeId;
    this.mainExchangeId = item.mainExchangeId;
    // todo
    this.mainPairInfo = this.convertPair(
      this.robotPairInfo[item.mainExchangePair],
      this.exchange[item.mainExchangeId]
    );
    this.mainAccount = item.mainExchangeAccountId;
    this.mainFee = item.mainExchangeFee;
    this.secondExchangeId = item.secondExchangeId;
    this.secondPairInfo = this.convertPair(
      this.robotPairInfo[item.secondExchangePair.split(',')[0]],
      this.exchange[item.secondExchangeId]
    );
    this.secondAccount = item.secondExchangeAccountId;
    this.secondFee = item.secondExchangeFee;
    if (item.secondExchangePair.split('').length === 2) {
      this.secondPairIdTwo = item.secondExchangePair.split('')[1];
      this.secondPairTwoInfo = this.convertPair(
        this.robotPairInfo[item.secondExchangePair.split(',')[1]],
        this.exchange[item.secondExchangeId]
      );
    }
    this.disabledType = true;
    this.disabledSelectedExchange = true;
    this.disabledSelectedMainExchange = true;
    if (this.robotTypeName[this.selectedType.id] === RobotName.Timer) {
      const config = this.getTimerConfig(item.arguments);
      this.configForm = {
        orderAmount: config.orderAmount,
        interval: config.interval,
        arbitrage: !!config.arbitrage,
        unilateral: !!config.unilateral
      };
    } else if (this.robotTypeName[this.selectedType.id] === RobotName.Maker) {
      const config = this.getMakerConfig(item.arguments);
      this.configFormMaker = {
        token1Amount: config.token1Amount,
        gridSpread: '1',
        minimumProfit: config.minimumProfit,
        minimumPriceFluctuation: config.minimumPriceFluctuation
      };
    }
    this.$nextTick(() => {
      (this.$refs.selectChange as any).selectedExchange.id =
        item.mainExchangeId;
      (this.$refs.secondSelectExchange as any).selectedExchange.id =
        item.secondExchangeId;
      (this.$refs.selectChange as any).init(
        item.mainExchangePair,
        item.mainExchangeAccountId
      );
      const pair = item.secondExchangePair.split(',');
      (this.$refs.secondSelectExchange as any).init(
        pair[0],
        item.secondExchangeAccountId,
        pair[1]
      );
    });
  }
  private convertPair(
    pair: RobotICDexInfo | BinanceSymbol,
    exchangeName: ExchangeName
  ): PairInfo | BinanceSymbol {
    if (exchangeName === ExchangeName.ICDex) {
      pair = pair as RobotICDexInfo;
      const token0 = JSON.parse(pair.token0);
      token0[0] = Principal.fromText(token0[0]);
      const token1 = JSON.parse(pair.token1);
      token1[0] = Principal.fromText(token1[0]);
      const pairInfo: PairInfo = {
        pairId: pair.pairId,
        decimals: pair.decimals,
        setting: JSON.parse(pair.setting),
        owner: null,
        name: pair.name,
        version: pair.version,
        token0: token0,
        token1: token1,
        token0Info: JSON.parse(pair.token0Info),
        token1Info: JSON.parse(pair.token1Info),
        paused: !!pair.paused
      };
      return pairInfo;
    } else {
      return pair as BinanceSymbol;
    }
  }
  private filterJson(val): string {
    return JSON.stringify(val, (key, value) =>
      value instanceof Array && value.length >= 16 // todo 16
        ? toHexString(new Uint8Array(value))
        : typeof value === 'bigint'
        ? value.toString()
        : value && value['__principal__']
        ? value['__principal__']
        : value
    );
  }
  private initPairInfo(
    mainExchangeName: ExchangeName,
    pairId: string,
    pairInfo: PairInfo | BinanceSymbol
  ): string {
    if (mainExchangeName === ExchangeName.ICDex && pairInfo) {
      pairInfo = pairInfo as PairInfo;
      if (!pairInfo.pairId) {
        pairInfo.pairId = pairId;
      }
      if (!pairInfo.token0Info) {
        pairInfo.token0Info = this.tokenInfo[pairInfo.token0[0].toString()];
      }
      if (!pairInfo.token1Info) {
        pairInfo.token1Info = this.tokenInfo[pairInfo.token1[0].toString()];
      }
    }
    if (pairInfo) {
      return this.filterJson(pairInfo);
    }
    return null;
  }
  private changeMainAccount(accountId: number): void {
    this.mainAccount = accountId;
  }
  private changeSecondAccount(accountId: number): void {
    this.secondAccount = accountId;
  }
  private changeInvert(invert: boolean): void {
    this.invert = invert ? 1 : 0;
  }
  private changePairMain(
    pairId: string,
    pairInfo: PairInfo | BinanceSymbol
  ): void {
    this.mainPairId = pairId;
    this.mainPairInfo = pairInfo;
    this.getICDexTokenInfo(this.mainExchangeId, this.mainPairInfo);
    (this.$refs.configForm as Vue & WrappedFormUtils).resetFields();
  }
  private changePairSecond(
    pairId: string,
    pairInfo: PairInfo | BinanceSymbol
  ): void {
    this.secondPairId = pairId;
    this.secondPairInfo = pairInfo;
    this.getICDexTokenInfo(this.secondExchangeId, this.secondPairInfo);
    (this.$refs.configForm as Vue & WrappedFormUtils).resetFields();
  }
  private changePairTwo(
    pairId: string,
    pairInfo: PairInfo | BinanceSymbol
  ): void {
    this.secondPairIdTwo = pairId;
    this.secondPairTwoInfo = pairInfo;
    this.getICDexTokenInfo(this.secondExchangeId, this.secondPairTwoInfo);
    (this.$refs.configForm as Vue & WrappedFormUtils).resetFields();
  }
  private getICDexTokenInfo(
    exchangeId: number,
    pairInfo: PairInfo | BinanceSymbol
  ): void {
    if (pairInfo && this.exchange[exchangeId] === ExchangeName.ICDex) {
      const pair = pairInfo as PairInfo;
      if (!this.tokenInfo[pair.token0[0].toString()]) {
        getTokenInfo(pair.token0[0], pair.token0[2]).then((res) => {
          this.$set(this.tokenInfo, pair.token0[0].toString(), res);
        });
      }
      if (!this.tokenInfo[pair.token0[1].toString()]) {
        getTokenInfo(pair.token1[0], pair.token1[2]).then((res) => {
          this.$set(this.tokenInfo, pair.token1[0].toString(), res);
        });
      }
    }
  }
  private changeMainExchange(exchangeId: number): void {
    this.mainExchangeId = exchangeId;
    this.disabledSelectedExchange = !this.mainExchangeId;
    this.secondExchanges = this.exchanges.filter(
      (exchange) => exchange.id !== this.mainExchangeId
    );
    (this.$refs.secondSelectExchange as any).initSecondExchange();
    (this.$refs.configForm as Vue & WrappedFormUtils).resetFields();
  }
  private addExchangeAccountSuccess(): void {
    this.getAccounts();
  }
  private changeSecondExchange(exchangeId: number): void {
    this.secondExchangeId = exchangeId;
    (this.$refs.configForm as Vue & WrappedFormUtils).resetFields();
  }
  private changeMainExchangeAccountFee(fee: string): void {
    this.mainFee = fee;
  }
  private changeSecondExchangeAccountFee(fee: string): void {
    this.secondFee = fee;
  }
  private async getExchanges(): Promise<void> {
    try {
      const res = await this.$axios.get('/getExchanges');
      if (res && res.status === 200) {
        this.exchanges = res.data;
        this.secondExchanges = res.data;
        res.data.forEach((item) => {
          if (item.name === ExchangeName.ICDex) {
            this.mainExchanges = [item];
          }
          this.exchange[item.id] = item.name;
        });
        await this.getAccounts();
        await this.getRobots();
        await this.getOrders();
      }
    } catch (e) {}
  }
  private async showErrors(item: Robot): Promise<void> {
    this.spinningOrdersError = true;
    this.robotError = item;
    this.visibleErrors = true;
    try {
      const res = await this.$axios.get(
        `/getOrders?page=${this.pageOrderError}&pageSize=${this.pageSizeOrderError}&strategyId=${item.id}&status=Failed`
      );
      if (res && res.status === 200) {
        const response = res.data as OrdersTable;
        const orders = response.orders;
        this.totalOrderError = response.total;
        const pairInfo = [];
        orders.forEach((item) => {
          item.balanceChangesFilled = { token0: 0, token1: 0 };
          if (
            !pairInfo.includes(item.strategy.mainExchangePair) &&
            !this.robotPairInfo[item.strategy.mainExchangePair]
          ) {
            this.getPairInfo(
              item.strategy.mainExchangePair,
              item.strategy.mainExchangeId,
              this.exchange[item.strategy.mainExchangeId],
              item.strategy.mainExchangeAccountId
            );
          }
          const secondExchangePair =
            item.strategy.secondExchangePair.split(',');
          if (
            !pairInfo.includes(secondExchangePair[0]) &&
            !this.robotPairInfo[secondExchangePair[0]]
          ) {
            pairInfo.push(secondExchangePair[0]);
            this.getPairInfo(
              secondExchangePair[0],
              item.strategy.secondExchangeId,
              this.exchange[item.strategy.secondExchangeId],
              item.strategy.secondExchangeAccountId
            );
          }
          if (
            secondExchangePair.length &&
            secondExchangePair[1] &&
            !pairInfo.includes(secondExchangePair[1]) &&
            !this.robotPairInfo[secondExchangePair[1]]
          ) {
            pairInfo.push(secondExchangePair[1]);
            this.getPairInfo(
              secondExchangePair[1],
              item.strategy.secondExchangeId,
              this.exchange[item.strategy.secondExchangeId],
              item.strategy.secondExchangeAccountId
            );
          }
        });
        this.ordersError = orders;
      }
    } catch (e) {
      //
    }
    this.spinningOrdersError = false;
  }
  private pageChangeOrderError(): void {
    this.showErrors(this.robotError);
  }
  private filterMessage(item: OrderRow): string {
    if (item.mainExchangeErrorMessage) {
      try {
        const objVal = JSON.parse(item.mainExchangeErrorMessage);
        if (objVal && objVal.message) {
          return objVal.message;
        }
      } catch (e) {
        return item.mainExchangeErrorMessage;
      }
    } else if (item.secondExchangeErrorMessage) {
      try {
        const objVal = JSON.parse(item.secondExchangeErrorMessage);
        if (objVal && objVal.message) {
          return objVal.message;
        }
      } catch (e) {
        return item.secondExchangeErrorMessage;
      }
    }
    return '-';
  }
  private pageChangeOrder(): void {
    this.getOrders();
  }
  private async getOrders(): Promise<void> {
    this.spinningOrders = true;
    try {
      const res = await this.$axios.get(
        `/getOrders?page=${this.pageOrder}&pageSize=${this.pageSizeOrder}&status=Completed&strategyId=${this.filterRobot.id}`
      );
      if (res && res.status === 200) {
        const response = res.data as OrdersTable;
        const orders = response.orders;
        this.totalOrder = response.total;
        const pairInfo = [];
        orders.forEach((item) => {
          item.balanceChangesFilled = { token0: 0, token1: 0 };
          if (
            !pairInfo.includes(item.strategy.mainExchangePair) &&
            !this.robotPairInfo[item.strategy.mainExchangePair]
          ) {
            this.getPairInfo(
              item.strategy.mainExchangePair,
              item.strategy.mainExchangeId,
              this.exchange[item.strategy.mainExchangeId],
              item.strategy.mainExchangeAccountId
            );
          }
          const secondExchangePair =
            item.strategy.secondExchangePair.split(',');
          if (
            !pairInfo.includes(secondExchangePair[0]) &&
            !this.robotPairInfo[secondExchangePair[0]]
          ) {
            pairInfo.push(secondExchangePair[0]);
            this.getPairInfo(
              secondExchangePair[0],
              item.strategy.secondExchangeId,
              this.exchange[item.strategy.secondExchangeId],
              item.strategy.secondExchangeAccountId
            );
          }
          if (
            secondExchangePair.length &&
            secondExchangePair[1] &&
            !pairInfo.includes(secondExchangePair[1]) &&
            !this.robotPairInfo[secondExchangePair[1]]
          ) {
            pairInfo.push(secondExchangePair[1]);
            this.getPairInfo(
              secondExchangePair[1],
              item.strategy.secondExchangeId,
              this.exchange[item.strategy.secondExchangeId],
              item.strategy.secondExchangeAccountId
            );
          }
        });
        this.orders = orders;
      }
    } catch (e) {
      //
    }
    this.spinningOrders = false;
  }
  private async getRobotType(): Promise<void> {
    try {
      const res = await this.$axios.get('/getRobotType');
      if (res && res.status === 200) {
        this.robotType = res.data;
        this.robotType.forEach((type) => {
          this.robotTypeName[type.id] = type.name;
        });
      }
    } catch (e) {}
  }
  private showAddRobot(): void {
    this.visible = true;
    this.title = 'Add robot';
    this.type = 'Add';
    this.disabledType = false;
    this.disabledSelectedMainExchange = false;
  }
  private pageChange(): void {
    this.getRobots();
  }
  private async cancelAll(): Promise<void> {
    this.spinningOrders = true;
    try {
      const res = await this.$axios.post('cancelAll');
      if (res && res.status === 200) {
        await this.getRobots();
        await this.getOrders();
        this.$message.success('cancel all success');
      } else {
        this.$message.error('Error');
      }
    } catch (e) {
      this.$message.error('Error');
    }
    this.spinningOrders = false;
  }
  private async getRobots(): Promise<void> {
    this.spinningExchange = true;
    try {
      const res = await this.$axios.get(
        `/getStrategies?page=${this.page}&pageSize=${this.pageSize}`
      );
      const pairInfo = [];
      const depthInfo = [];
      let balanceInfo = {};
      let balanceInfoBinance = [];
      if (res && res.status === 200) {
        this.robots = res.data.data;
        this.total = res.data.total;
        this.robots.forEach((robot) => {
          if (this.exchange[robot.mainExchangeId] === ExchangeName.ICDex) {
            balanceInfo = this.filterICDexBalance(
              balanceInfo,
              robot.mainExchangePair,
              robot.mainExchangeAccountId
            );
          } else if (
            this.exchange[robot.mainExchangeId] === ExchangeName.Binance
          ) {
            balanceInfoBinance = this.filterBinanceBalance(
              balanceInfoBinance,
              robot.mainExchangeAccountId
            );
          }
          if (
            !pairInfo.includes(robot.mainExchangePair) &&
            !this.robotPairInfo[robot.mainExchangePair]
          ) {
            pairInfo.push(robot.mainExchangePair);
            this.getPairInfo(
              robot.mainExchangePair,
              robot.mainExchangeId,
              this.exchange[robot.mainExchangeId],
              robot.mainExchangeAccountId
            );
          }
          if (!depthInfo.includes(robot.mainExchangePair)) {
            depthInfo.push(robot.mainExchangePair);
            this.getDepth(
              robot.mainExchangePair,
              this.exchange[robot.mainExchangeId]
            );
          }
          const secondExchangePair = robot.secondExchangePair.split(',');
          if (this.exchange[robot.secondExchangeId] === ExchangeName.ICDex) {
            balanceInfo = this.filterICDexBalance(
              balanceInfo,
              secondExchangePair[0],
              robot.secondExchangeAccountId
            );
          } else if (
            this.exchange[robot.secondExchangeId] === ExchangeName.Binance
          ) {
            balanceInfoBinance = this.filterBinanceBalance(
              balanceInfoBinance,
              robot.secondExchangeAccountId
            );
          }
          if (
            !pairInfo.includes(secondExchangePair[0]) &&
            !this.robotPairInfo[secondExchangePair[0]]
          ) {
            pairInfo.push(secondExchangePair[0]);
            this.getPairInfo(
              secondExchangePair[0],
              robot.secondExchangeId,
              this.exchange[robot.secondExchangeId],
              robot.secondExchangeAccountId
            );
          }
          if (!depthInfo.includes(secondExchangePair[0])) {
            depthInfo.push(secondExchangePair[0]);
            this.getDepth(
              secondExchangePair[0],
              this.exchange[robot.secondExchangeId]
            );
          }
          if (secondExchangePair.length) {
            if (secondExchangePair[1]) {
              this.$set(robot, 'secondExchangePairTwo', secondExchangePair[1]);
              if (
                this.exchange[robot.secondExchangeId] === ExchangeName.ICDex
              ) {
                balanceInfo = this.filterICDexBalance(
                  balanceInfo,
                  secondExchangePair[1],
                  robot.secondExchangeAccountId
                );
              } else if (
                this.exchange[robot.secondExchangeId] === ExchangeName.Binance
              ) {
                balanceInfoBinance = this.filterBinanceBalance(
                  balanceInfoBinance,
                  robot.secondExchangeAccountId
                );
              }
              if (
                !pairInfo.includes(secondExchangePair[1]) &&
                !this.robotPairInfo[secondExchangePair[1]]
              ) {
                pairInfo.push(secondExchangePair[1]);
                this.getPairInfo(
                  secondExchangePair[1],
                  robot.secondExchangeId,
                  this.exchange[robot.secondExchangeId],
                  robot.secondExchangeAccountId
                );
              }
              if (!depthInfo.includes(secondExchangePair[1])) {
                depthInfo.push(secondExchangePair[1]);
                this.getDepth(
                  secondExchangePair[1],
                  this.exchange[robot.secondExchangeId]
                );
              }
            }
          }
        });
        this.infoInterval();
        this.initSSEError();
        this.initSSETrade();
      }
    } catch (e) {}
    this.spinningExchange = false;
  }
  private filterICDexBalance(
    balanceInfo: { [key: string]: Array<string> },
    pairId: string,
    accountId: number
  ): { [key: string]: Array<string> } {
    try {
      const account = this.robotAccounts[accountId];
      const res = JSON.parse(account.value) as RobotICDexConfig;
      if (res && res.pem) {
        const identity = identityFromPem(res.pem);
        const principal = identity.getPrincipal().toString();
        if (!balanceInfo[principal]) {
          balanceInfo[principal] = [];
        }
        if (!this.robotBalance[principal]) {
          this.robotBalance[principal] = {};
        }
        if (
          !balanceInfo[principal].includes(pairId) &&
          !this.robotBalance[principal][pairId]
        ) {
          balanceInfo[principal].push(pairId);
          this.getAccountBalance(pairId, principal);
        }
      }
    } catch (e) {}
    return balanceInfo;
  }
  private filterBinanceBalance(
    balanceInfo: Array<string>,
    accountId: number
  ): Array<string> {
    try {
      const account = this.robotAccounts[accountId];
      const res = JSON.parse(account.value) as RobotBinanceConfig;
      if (
        res &&
        res.APIKey &&
        res.privateKey &&
        !balanceInfo.includes(res.APIKey)
      ) {
        balanceInfo.push(res.APIKey);
        this.getBinanceTokenAmount(accountId, res);
      }
    } catch (e) {}
    return balanceInfo;
  }
  private async refreshBinanceBalance(account: Account): Promise<void> {
    this.refreshBinanceBalanceLoading = true;
    try {
      const res = JSON.parse(account.value) as RobotBinanceConfig;
      if (res && res.APIKey && res.privateKey) {
        if (isRunning) {
          return;
        }
        isRunning = true;
        await this.needWait('rateLimitTime');
        this.getBinanceTokenAmount(account.id, res).finally(() => {
          isRunning = false;
        });
      }
    } catch (e) {}
    this.refreshBinanceBalanceLoading = false;
  }
  private async getAccounts(): Promise<Array<Account>> {
    try {
      const res = await this.$axios.get('/getAccounts');
      if (res && res.status === 200) {
        const accounts: Array<Account> = res.data;
        const ICDexAccounts = [];
        const BinanceAccounts = [];
        accounts.forEach((account) => {
          this.robotAccounts[account.id] = account;
          if (this.exchange[account.exchangeId] === 'ICDex') {
            ICDexAccounts.push(account);
          } else if (this.exchange[account.exchangeId] === 'Binance') {
            BinanceAccounts.push(account);
          }
        });
        this.ICDexAccounts = ICDexAccounts;
        this.BinanceAccounts = BinanceAccounts;
      }
    } catch (e) {}
    return [];
  }
  private async needWait(
    type: 'rateLimitTime' | 'rateLimitTimeOrder'
  ): Promise<void> {
    // todo
    const rateLimitTime = localStorage.getItem(type);
    if (rateLimitTime) {
      this[type] = Number(rateLimitTime);
    } else {
      this[type] = new Date().getTime();
    }
    const now = new Date().getTime();
    let remaining;
    if (type === 'rateLimitTime') {
      remaining = this.rateLimitTime + intervalTime - now;
    }
    if (remaining > 0) {
      await this.wait(remaining);
    }
    const waitNow = new Date().getTime();
    localStorage.setItem(type, waitNow.toString(10));
  }
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  private async getBinanceTokenAmount(
    accountId: number,
    binanceAccount: RobotBinanceConfig
  ): Promise<void> {
    try {
      if (binanceAccount.APIKey && binanceAccount.privateKey) {
        const res = await this.$axios.get(`/getAccountInfo`, {
          params: {
            accountId: accountId
          }
        });
        if (res && res.status === 200) {
          const accountInfo = res.data as AccountInfo;
          this.$set(
            this.robotBalance,
            binanceAccount.APIKey,
            accountInfo.balances
          );
          this.$forceUpdate();
        }
      }
    } catch (e) {
      if (e.response && e.response.data && e.response.data.code) {
        if (e.response.data.code === 429 || e.response.data.code === 418) {
          this.$message.error(e.response.data.msg);
        }
      }
      return;
    }
  }
  private async getAccountBalance(
    pairId: string,
    account: string
  ): Promise<void> {
    const res = await this.ICDexService.accountBalance(pairId, account);
    if (res) {
      this.robotBalance[account][pairId] = {
        token0: res.token0.available.toString(10),
        token1: res.token1.available.toString(10)
      };
      this.$forceUpdate();
    }
    return null;
  }
  private onDepositKeepingBalance(
    account: Account,
    pairInfo: RobotICDexInfo | BinanceSymbol,
    isToken0 = true
  ): void {
    this.isToken0 = isToken0;
    pairInfo = pairInfo as RobotICDexInfo;
    this.currentPair = pairInfo;
    this.currentToken = null;
    let token = JSON.parse(pairInfo.token0) as SwapTokenInfo;
    if (!isToken0) {
      token = JSON.parse(pairInfo.token1) as SwapTokenInfo;
    }
    const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
    const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
    let decimals = token0Info.decimals;
    if (!isToken0) {
      decimals = token1Info.decimals;
    }
    let fee = new BigNumber(getFee(token0Info))
      .div(10 ** decimals)
      .toString(10);
    if (!isToken0) {
      fee = new BigNumber(getFee(token1Info)).div(10 ** decimals).toString(10);
    }
    let name = token0Info.name;
    if (!isToken0) {
      name = token1Info.name;
    }
    const res = JSON.parse(account.value) as RobotICDexConfig;
    if (res && res.pem) {
      const identity = identityFromPem(res.pem);
      this.currentIdentity = identity;
      const principal = identity.getPrincipal().toString();
      const balance =
        this.robotICDexLocalBalance[principal][token[0].toString()];
      this.currentToken = {
        canisterId: token[0].toString(),
        fee: fee,
        decimals: decimals,
        tokenStd: token[2],
        symbol: token[1],
        name: name,
        balance: balance
      };
      let subaccount = new Uint8Array(fromSubAccountId(0));
      const currentAddress = principalToAccountIdentifier(
        Principal.fromText(principal),
        subaccount
      );
      this.$nextTick(() => {
        (this.$refs as any).transferToken.transferForm.to =
          this.robotPairInfo.pairId + '.' + currentAddress;
        (this.$refs as any).transferToken.init(this.currentToken);
      });
    }
  }
  private async onKeepingBalance(
    account: Account,
    pairInfo: RobotICDexInfo | BinanceSymbol,
    isToken0 = true
  ): Promise<void> {
    pairInfo = pairInfo as RobotICDexInfo;
    this.currentPair = pairInfo;
    this.currentToken = null;
    let token = JSON.parse(pairInfo.token0) as SwapTokenInfo;
    if (!isToken0) {
      token = JSON.parse(pairInfo.token1) as SwapTokenInfo;
    }
    const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
    const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
    let decimals = token0Info.decimals;
    if (!isToken0) {
      decimals = token1Info.decimals;
    }
    let fee = new BigNumber(getFee(token0Info))
      .div(10 ** decimals)
      .toString(10);
    if (!isToken0) {
      fee = new BigNumber(getFee(token1Info)).div(10 ** decimals).toString(10);
    }
    let name = token0Info.name;
    if (!isToken0) {
      name = token1Info.name;
    }
    const res = JSON.parse(account.value) as RobotICDexConfig;
    if (res && res.pem) {
      const identity = identityFromPem(res.pem);
      this.currentIdentity = identity;
      const principal = identity.getPrincipal().toString();
      let balance = new BigNumber(
        this.robotBalance[principal][pairInfo.pairId].token0
      )
        .div(10 ** decimals)
        .toString(10);
      if (!isToken0) {
        balance = new BigNumber(
          this.robotBalance[principal][pairInfo.pairId].token1
        )
          .div(10 ** decimals)
          .toString(10);
      }
      this.currentToken = {
        canisterId: token[0].toString(),
        fee: fee,
        decimals: decimals,
        tokenStd: token[2],
        symbol: token[1],
        name: name,
        balance: balance
      };
      this.$nextTick(() => {
        (this.$refs as any).withdrawToken.init(this.currentToken, isToken0);
      });
    }
  }
  private DepositSuccess(): void {
    this.getLocalTokenBalance(
      this.currentIdentity.getPrincipal().toString(),
      this.currentToken.canisterId.toString(),
      this.currentToken
    );
    this.getAccountBalance(
      this.currentPair.pairId,
      this.currentIdentity.getPrincipal().toString()
    );
  }
  private withdrawSuccess(): void {
    this.getLocalTokenBalance(
      this.currentIdentity.getPrincipal().toString(),
      this.currentToken.canisterId.toString(),
      this.currentToken
    );
    this.getAccountBalance(
      this.currentPair.pairId,
      this.currentIdentity.getPrincipal().toString()
    );
  }
  private async refreshBalanceTraderAccount(
    account: Account,
    pairId: string
  ): Promise<void> {
    this.refreshBalanceTraderAccountLoading = true;
    try {
      const res = JSON.parse(account.value) as RobotICDexConfig;
      if (res && res.pem) {
        const identity = identityFromPem(res.pem);
        const principal = identity.getPrincipal().toString();
        if (pairId && pairId.split(',').length > 1) {
          const pair = pairId.split(',');
          await this.getAccountBalance(pair[0], principal);
          await this.getAccountBalance(pair[1], principal);
        } else {
          await this.getAccountBalance(pairId, principal);
        }
      }
    } catch (e) {}
    this.refreshBalanceTraderAccountLoading = false;
  }
  private async refreshBalance(account: Account, pair: string): Promise<void> {
    this.refreshBalanceLoading = true;
    try {
      if (pair) {
        const pairs = pair.split(',');
        const pairInfo = this.robotPairInfo[pairs[0]] as RobotICDexInfo;
        let pairInfo1;
        if (pairs[1]) {
          pairInfo1 = this.robotPairInfo[pairs[1]] as RobotICDexInfo;
        }
        const res = JSON.parse(account.value) as RobotICDexConfig;
        const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
        let token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
        if (pairInfo1) {
          token1Info = JSON.parse(pairInfo1.token0Info) as TokenInfo;
        }
        if (res && res.pem) {
          const identity = identityFromPem(res.pem);
          const principal = identity.getPrincipal().toString();
          const token0 = JSON.parse(pairInfo.token0) as SwapTokenInfo;
          const token1 = JSON.parse(pairInfo.token1) as SwapTokenInfo;
          await this.getLocalTokenBalance(
            principal,
            token0[0].toString(),
            token0Info
          );
          await this.getLocalTokenBalance(
            principal,
            token1[0].toString(),
            token1Info
          );
        }
      }
    } catch (e) {}
    this.refreshBalanceLoading = false;
  }
  private async filterLocalBalance(
    accountId: number,
    pairInfo: RobotICDexInfo
  ): Promise<void> {
    try {
      const token0Info = JSON.parse(pairInfo.token0Info) as TokenInfo;
      const token1Info = JSON.parse(pairInfo.token1Info) as TokenInfo;
      const account = this.robotAccounts[accountId];
      const res = JSON.parse(account.value) as RobotICDexConfig;
      if (res && res.pem) {
        const identity = identityFromPem(res.pem);
        const principal = identity.getPrincipal().toString();
        const token0 = JSON.parse(pairInfo.token0) as SwapTokenInfo;
        if (
          !(
            this.robotICDexLocalBalance[principal] &&
            this.robotICDexLocalBalance[principal][token0[0].toString()]
          )
        ) {
          this.getLocalTokenBalance(
            principal,
            token0[0].toString(),
            token0Info
          );
        }
        const token1 = JSON.parse(pairInfo.token1) as SwapTokenInfo;
        if (
          !(this.robotICDexLocalBalance[principal] && [token1[0].toString()])
        ) {
          this.getLocalTokenBalance(
            principal,
            token1[0].toString(),
            token1Info
          );
        }
      }
    } catch (e) {
      //
    }
  }
  private async getLocalTokenBalance(
    account: string,
    tokenId: string,
    tokenInfo: TokenInfo
  ): Promise<void> {
    const res = await getTokenBalance(tokenInfo.tokenStd, tokenId, account);
    const balance = new BigNumber(res)
      .div(10 ** tokenInfo.decimals)
      .toString(10);
    if (!this.robotICDexLocalBalance[account]) {
      this.robotICDexLocalBalance[account] = {};
    }
    this.robotICDexLocalBalance[account][tokenId] = balance;
    this.$forceUpdate();
  }
  private async getDepth(
    pairId: string,
    exchangeName: ExchangeName
  ): Promise<void> {
    try {
      if (exchangeName === ExchangeName.ICDex) {
        const res = await this.ICDexService.level10(pairId);
        if (res) {
          this.$set(this.robotDepth, pairId, res);
        }
        const stats = await this.ICDexService.stats(pairId);
        if (stats) {
          if (this.robotStats[pairId]) {
            const price: PairPrice = {
              symbol: pairId,
              lastPrice: this.robotStats[pairId].latestPrice,
              latestPrice: stats.price
            };
            this.$set(this.robotStats, pairId, price);
          } else {
            const price: PairPrice = {
              symbol: pairId,
              lastPrice: stats.price,
              latestPrice: stats.price
            };
            this.$set(this.robotStats, pairId, price);
          }
        }
      } else if (exchangeName === ExchangeName.Binance) {
        const res = await this.$axios.get(`/getDepth?symbol=${pairId}`);
        if (res && res.status === 200) {
          this.$set(this.robotDepth, pairId, res.data);
        }
        const tickerPrice = await this.$axios.get(
          `/getTickerPrice?symbol=${pairId}`
        );
        if (tickerPrice && tickerPrice.status === 200) {
          if (this.robotStats[pairId]) {
            const price: PairPrice = {
              symbol: pairId,
              lastPrice: this.robotStats[pairId].latestPrice,
              latestPrice: tickerPrice.data.price
            };
            this.$set(this.robotStats, pairId, price);
          } else {
            const price: PairPrice = {
              symbol: pairId,
              lastPrice: tickerPrice.data.price,
              latestPrice: tickerPrice.data.price
            };
            this.$set(this.robotStats, pairId, price);
          }
        }
      }
    } catch (e) {}
  }
  private async getPairInfo(
    pairId: string,
    exchangeId: number,
    exchangeName: ExchangeName,
    accountId: number
  ): Promise<void> {
    try {
      const res = await this.$axios.get(
        `/getPairInfo?pairId=${pairId}&exchangeName=${exchangeName}`
      );
      if (res.status === 200 && res.data) {
        if (exchangeName === ExchangeName.ICDex) {
          this.$set(this.robotPairInfo, pairId, res.data);
          this.filterLocalBalance(accountId, res.data);
          const token0 = JSON.parse(res.data.token0) as SwapTokenInfo;
          const token1 = JSON.parse(res.data.token1) as SwapTokenInfo;
          const token0Info = JSON.parse(res.data.token0Info) as TokenInfo;
          const token1Info = JSON.parse(res.data.token1Info) as TokenInfo;
          this.getICDexTokenInfo(
            exchangeId,
            Object.assign({}, res.data, {
              token0: token0,
              token1: token1,
              token0Info: token0Info,
              token1Info: token1Info
            })
          );
        } else if (exchangeName === ExchangeName.Binance) {
          const filters = JSON.parse(res.data.filters);
          this.$set(
            this.robotPairInfo,
            pairId,
            Object.assign({}, res.data, { filters: filters })
          );
        }
      }
    } catch (e) {}
  }
  private getTimerConfig(val: string): TimerConfig {
    try {
      return JSON.parse(val) as TimerConfig;
    } catch (e) {
      //
    }
  }
  private getMakerConfig(val: string): MakerConfig {
    try {
      return JSON.parse(val) as MakerConfig;
    } catch (e) {
      //
    }
  }
  private afterCloseError(): void {
    this.robotError = null;
    this.pageOrderError = 1;
    this.totalOrderError = 0;
  }
  private afterClose(): void {
    (this.$refs.configForm as Vue & WrappedFormUtils).resetFields();
    (this.$refs.configFormMaker as Vue & WrappedFormUtils).resetFields();
    (this.$refs.selectChange as any).initMainExchange();
    (this.$refs.secondSelectExchange as any).initSecondExchange();
    this.disabledType = true;
    this.disabledSelectedExchange = true;
    this.disabledSelectedMainExchange = true;
    this.selectedType.id = undefined;
    this.configForm = {
      orderAmount: '',
      interval: '',
      arbitrage: false,
      unilateral: false
    };
    this.configFormMaker = {
      token1Amount: '',
      gridSpread: '1',
      minimumProfit: '',
      minimumPriceFluctuation: ''
    };
    this.invert = 0;
  }
  private async getAvgPrice(symbol: string): Promise<AvgPrice> {
    try {
      const avgPriceRes = await this.$axios.get(
        `/getAvgPrice?symbol=${symbol}`
      );
      if (avgPriceRes.status === 200) {
        return avgPriceRes.data;
      }
    } catch (e) {
      if (e.response && e.response.data && e.response.data.code) {
        if (e.response.data.code === 429 || e.response.data.code === 418) {
          this.$message.error(e.response.data.msg);
        }
      }
      return null;
    }
  }
  private filterBinanceAPIKey(value: string): string {
    try {
      if (value) {
        const val = JSON.parse(value);
        return val.APIKey;
      }
    } catch (e) {
      //
    }
    return '-';
  }
  private filterICDexAccount(value: string): string {
    try {
      if (value) {
        const val = JSON.parse(value);
        const pem = val.pem;
        const identity = identityFromPem(pem);
        if (identity) {
          return identity.getPrincipal().toString();
        }
      }
    } catch (e) {
      //
    }
    return '-';
  }
  private changeFilter(): void {
    this.pageOrder = 1;
    this.pageSizeOrder = 10;
    this.totalOrder = 0;
    this.getOrders();
  }
  private filterBalance(
    pair: RobotICDexInfo | BinanceSymbol,
    robotBalance: {
      [key: string]: RobotICDexBalance | Array<Assets>;
    },
    account: Account,
    exchangeName: ExchangeName,
    isToken0: boolean
  ): string {
    try {
      if (pair && exchangeName && account) {
        if (exchangeName === ExchangeName.Binance) {
          const pairInfo = pair as BinanceSymbol;
          const value = JSON.parse(account.value) as RobotBinanceConfig;
          if (value && value.APIKey && robotBalance[value.APIKey]) {
            const balances = robotBalance[value.APIKey] as Array<Assets>;
            const balance = balances.find((item) => {
              if (isToken0) {
                return pairInfo.baseAsset === item.asset;
              } else {
                return pairInfo.quoteAsset === item.asset;
              }
            });
            if (balance) {
              return balance.free;
            }
            return '0';
          }
        } else if (exchangeName === ExchangeName.ICDex) {
          const pairInfo = pair as RobotICDexInfo;
          const value = JSON.parse(account.value) as RobotICDexConfig;
          if (value && value.pem) {
            const identity = identityFromPem(value.pem);
            const principal = identity.getPrincipal().toString();
            if (
              principal &&
              robotBalance[principal] &&
              robotBalance[principal][pairInfo.pairId]
            ) {
              const balance = robotBalance[principal][pairInfo.pairId] as {
                token0: string;
                token1: string;
              };
              if (isToken0) {
                if (pairInfo.token0Info) {
                  const token0Decimals = JSON.parse(
                    pairInfo.token0Info
                  ).decimals;
                  return new BigNumber(balance.token0)
                    .div(10 ** token0Decimals)
                    .toString(10);
                }
              } else {
                if (pairInfo.token1Info) {
                  const token1Decimals = JSON.parse(
                    pairInfo.token1Info
                  ).decimals;
                  return new BigNumber(balance.token1)
                    .div(10 ** token1Decimals)
                    .toString(10);
                }
              }
            }
          }
        }
      }
    } catch (e) {}
    return '';
  }
  private insufficientBalance(
    robotName: RobotName,
    config: string,
    pair: RobotICDexInfo | BinanceSymbol,
    robotBalance: {
      [key: string]: RobotICDexBalance | Array<Assets>;
    },
    account: Account,
    exchangeName: ExchangeName
  ): boolean {
    if (robotName === RobotName.Timer) {
      const balance = this.filterBalance(
        pair,
        robotBalance,
        account,
        exchangeName,
        true
      );
      const orderAmount = this.getTimerConfig(config).orderAmount;
      return new BigNumber(balance).lt(orderAmount);
    }
    if (robotName === RobotName.Maker) {
      const balance = this.filterBalance(
        pair,
        robotBalance,
        account,
        exchangeName,
        false
      );
      const token1Amount = this.getMakerConfig(config).token1Amount;
      return new BigNumber(balance).lt(token1Amount);
    }
    return false;
  }
}
</script>
<style lang="scss" scoped>
.dashboard-title {
  font-size: 18px;
}
.robot-filter-select {
  margin-top: 0;
  margin-left: 10px;
  padding-bottom: 0;
}
.horizontal-line {
  display: inline-block;
  margin-top: 20px;
  border-top: 2px solid #252930;
  width: 100%;
}
.add-robot-modal {
  button {
    height: 36px;
  }
}
.config-arbitrage-form {
  /*::v-deep .ant-form-item-with-help {
		margin-bottom: 24px;
	}*/
  /*::v-deep .ant-form-item {
		align-items: flex-start;
	}*/
  align-items: flex-start;
  ::v-deep .ant-form-explain {
    display: flex;
    flex-wrap: wrap;
    width: 210px;
  }
}
.exchange-main {
  table {
    line-height: 1.5;
    font-size: 12px;
    th,
    td {
      font-size: 12px;
    }
    .operation-td {
      .operation {
        color: #1996c4;
        padding: 0;
        i {
          margin-right: 0;
          color: #1996c4;
          font-size: 12px;
        }
      }
      span {
        margin-right: 10px;
        cursor: pointer;
        font-size: 13px;
        &.disabled {
          color: #ccc;
          cursor: not-allowed;
          opacity: 0.5;
        }
      }
    }
  }
  a {
    color: #1996c4 !important;
  }
}
.view-robot {
  margin-top: 40px;
  .view-robot-label {
    width: 135px;
  }
  .flex-grow {
    flex-grow: 1;
  }
  .flex1 {
    flex: 1;
  }
  .flex-start {
    align-items: flex-start;
  }
  .ask-price,
  .bid-price {
    font-size: 12px;
  }
  .view-robot-right {
    padding-left: 135px;
  }
}
.view-invert-pair {
  ::v-deep &.ant-checkbox-wrapper-disabled {
    span {
      color: #adb3c4;
      padding-left: 0;
    }
  }
}
</style>
