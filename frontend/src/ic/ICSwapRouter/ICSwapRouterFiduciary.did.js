export default ({ IDL }) => {
  const Address = IDL.Text;
  const AccountIdentifier = IDL.Text;
  const User = IDL.Variant({
    principal: IDL.Principal,
    address: AccountIdentifier
  });
  const TokenIdentifier = IDL.Text;
  const Balance = IDL.Nat;
  const NFTType = IDL.Variant({
    MARS: IDL.Null,
    JUPITER: IDL.Null,
    URANUS: IDL.Null,
    UNKNOWN: IDL.Null,
    MERCURY: IDL.Null,
    NEPTUNE: IDL.Null,
    VENUS: IDL.Null,
    SATURN: IDL.Null,
    EARTH: IDL.Null
  });
  const CollectionId = IDL.Principal;
  const NFT = IDL.Tuple(User, TokenIdentifier, Balance, NFTType, CollectionId);
  const Time = IDL.Int;
  const StakedNFT = IDL.Tuple(IDL.Text, TokenIdentifier, Time);
  const AccountId = IDL.Vec(IDL.Nat8);
  const PairCanisterId = IDL.Principal;
  const ConfigRequest = IDL.Record({
    BLACKHOLE: IDL.Opt(IDL.Principal),
    SYS_TOKEN: IDL.Opt(IDL.Principal),
    SCORE_G1: IDL.Opt(IDL.Nat),
    SCORE_G2: IDL.Opt(IDL.Nat),
    SCORE_G3: IDL.Opt(IDL.Nat),
    SCORE_G4: IDL.Opt(IDL.Nat),
    ORACLE: IDL.Opt(IDL.Principal)
  });
  const DRC207Support = IDL.Record({
    timer: IDL.Record({
      interval_seconds: IDL.Opt(IDL.Nat),
      enable: IDL.Bool
    }),
    monitorable_by_self: IDL.Bool,
    monitorable_by_blackhole: IDL.Record({
      canister_id: IDL.Opt(IDL.Principal),
      allowed: IDL.Bool
    }),
    cycles_receivable: IDL.Bool
  });
  const Config = IDL.Record({
    BLACKHOLE: IDL.Principal,
    SYS_TOKEN: IDL.Principal,
    SCORE_G1: IDL.Nat,
    SCORE_G2: IDL.Nat,
    SCORE_G3: IDL.Nat,
    SCORE_G4: IDL.Nat,
    ORACLE: IDL.Principal
  });
  const TokenSymbol = IDL.Text;
  const TokenStd__1 = IDL.Variant({
    dft: IDL.Null,
    ext: IDL.Null,
    icp: IDL.Null,
    other: IDL.Text,
    cycles: IDL.Null,
    ledger: IDL.Null,
    icrc1: IDL.Null,
    dip20: IDL.Null,
    drc20: IDL.Null
  });
  const TokenInfo__1 = IDL.Tuple(IDL.Principal, TokenSymbol, TokenStd__1);
  const DexName__1 = IDL.Text;
  const TokenInfo = IDL.Tuple(IDL.Principal, TokenSymbol, TokenStd__1);
  const PairCanister = IDL.Principal;
  const PairInfo = IDL.Record({
    feeRate: IDL.Float64,
    token0: TokenInfo,
    token1: TokenInfo,
    dexName: DexName__1,
    canisterId: PairCanister
  });
  const DexCompetitionResponse = IDL.Record({
    end: Time,
    content: IDL.Text,
    name: IDL.Text,
    start: Time,
    pairs: IDL.Vec(
      IDL.Tuple(
        DexName__1,
        PairInfo,
        IDL.Variant({ token0: IDL.Null, token1: IDL.Null })
      )
    ),
    hostedDex: DexName__1
  });
  const BalanceChange = IDL.Variant({
    DebitRecord: IDL.Nat,
    CreditRecord: IDL.Nat,
    NoChange: IDL.Null
  });
  const Txid = IDL.Vec(IDL.Nat8);
  const FilledTrade = IDL.Record({
    time: Time,
    token0Value: BalanceChange,
    counterparty: Txid,
    token1Value: BalanceChange
  });
  const TraderStats = IDL.Record({
    pnl: IDL.Float64,
    vol: IDL.Nat,
    trades: IDL.Vec(FilledTrade),
    count: IDL.Nat,
    time: Time,
    avgPrice: IDL.Float64,
    capital: IDL.Float64,
    position: IDL.Int
  });
  const TraderData = IDL.Record({
    startTime: Time,
    total: IDL.Opt(IDL.Tuple(TraderStats, IDL.Float64)),
    endTime: IDL.Opt(Time),
    data: IDL.Vec(TraderStats),
    pair: PairCanister,
    dexName: DexName__1,
    quoteToken: IDL.Variant({ token0: IDL.Null, token1: IDL.Null })
  });
  const TraderDataResponse = IDL.Record({
    startTime: Time,
    total: IDL.Opt(IDL.Tuple(TraderStats, IDL.Float64)),
    endTime: IDL.Opt(Time),
    data: IDL.Vec(TraderStats),
    pair: PairInfo,
    quoteToken: IDL.Variant({ token0: IDL.Null, token1: IDL.Null })
  });
  const TrieList_3 = IDL.Record({
    total: IDL.Nat,
    data: IDL.Vec(IDL.Tuple(AccountId, IDL.Vec(TraderDataResponse))),
    totalPage: IDL.Nat
  });
  const DexName = IDL.Text;
  const TrieList_2 = IDL.Record({
    total: IDL.Nat,
    data: IDL.Vec(IDL.Tuple(IDL.Nat, DexCompetitionResponse)),
    totalPage: IDL.Nat
  });
  const ListingReferrer__1 = IDL.Record({
    end: IDL.Opt(Time),
    verified: IDL.Bool,
    referrer: IDL.Principal,
    name: IDL.Text,
    start: Time,
    nftId: IDL.Text
  });
  const Timestamp = IDL.Nat;
  const MarketBoard = IDL.Variant({
    STAGE0: IDL.Null,
    STAGE1: IDL.Null,
    STAGE2: IDL.Null
  });
  const TradingPair = IDL.Record({
    startingOverG1: IDL.Opt(Timestamp),
    updatedTime: Timestamp,
    score1: IDL.Nat,
    score2: IDL.Nat,
    score3: IDL.Nat,
    pair: PairInfo,
    startingBelowG2: IDL.Opt(Timestamp),
    startingBelowG4: IDL.Opt(Timestamp),
    createdTime: Timestamp,
    marketBoard: MarketBoard
  });
  const TrieList = IDL.Record({
    total: IDL.Nat,
    data: IDL.Vec(IDL.Tuple(PairCanisterId, TradingPair)),
    totalPage: IDL.Nat
  });
  const Amount = IDL.Nat;
  const Vol = IDL.Record({ value0: Amount, value1: Amount });
  const Timestamp__1 = IDL.Nat;
  const PriceWeighted = IDL.Record({
    updateTime: Timestamp__1,
    token1TimeWeighted: IDL.Nat,
    token0TimeWeighted: IDL.Nat
  });
  const Liquidity2 = IDL.Record({
    vol: Vol,
    shares: Amount,
    shareWeighted: IDL.Record({
      updateTime: Timestamp__1,
      shareTimeWeighted: IDL.Nat
    }),
    unitValue: IDL.Tuple(Amount, Amount),
    orderCount: IDL.Nat64,
    token0: Amount,
    token1: Amount,
    priceWeighted: PriceWeighted,
    price: IDL.Nat,
    userCount: IDL.Nat64,
    unitSize: IDL.Nat
  });
  const ListingReferrer = IDL.Record({
    end: IDL.Opt(Time),
    verified: IDL.Bool,
    referrer: IDL.Principal,
    name: IDL.Text,
    start: Time,
    nftId: IDL.Text
  });
  const PairResponse = IDL.Record({
    pair: PairInfo,
    sponsored: IDL.Bool,
    liquidity: IDL.Opt(Liquidity2),
    createdTime: Timestamp,
    score: IDL.Nat,
    marketBoard: IDL.Opt(MarketBoard),
    listingReferrers: IDL.Vec(IDL.Tuple(ListingReferrer, Time, IDL.Text))
  });
  const TrieList_1 = IDL.Record({
    total: IDL.Nat,
    data: IDL.Vec(IDL.Tuple(PairCanisterId, PairResponse)),
    totalPage: IDL.Nat
  });
  const PairInfo__1 = IDL.Record({
    feeRate: IDL.Float64,
    token0: TokenInfo,
    token1: TokenInfo,
    dexName: DexName__1,
    canisterId: PairCanister
  });
  const TokenStd = IDL.Variant({
    dft: IDL.Null,
    ext: IDL.Null,
    icp: IDL.Null,
    other: IDL.Text,
    cycles: IDL.Null,
    ledger: IDL.Null,
    icrc1: IDL.Null,
    dip20: IDL.Null,
    drc20: IDL.Null
  });
  return IDL.Service({
    NFTBalance: IDL.Func([Address], [IDL.Vec(NFT)], ['query']),
    NFTDeposit: IDL.Func(
      [CollectionId, TokenIdentifier, IDL.Opt(IDL.Vec(IDL.Nat8))],
      [],
      []
    ),
    NFTStaked: IDL.Func([Address], [IDL.Vec(StakedNFT)], ['query']),
    NFTStakedList: IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(AccountId, IDL.Vec(StakedNFT)))],
      ['query']
    ),
    NFTUnStake: IDL.Func([AccountId, IDL.Text], [], []),
    NFTWithdraw: IDL.Func(
      [IDL.Opt(TokenIdentifier), IDL.Opt(IDL.Vec(IDL.Nat8))],
      [],
      []
    ),
    NFTs: IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(AccountId, IDL.Vec(NFT)))],
      ['query']
    ),
    addTokenMetadata: IDL.Func(
      [IDL.Principal, IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
      [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
      []
    ),
    autoPutPairToMarket: IDL.Func([PairCanisterId], [], []),
    config: IDL.Func(
      [ConfigRequest, IDL.Opt(IDL.Principal), IDL.Opt(IDL.Principal)],
      [IDL.Bool],
      []
    ),
    debugPairs: IDL.Func(
      [],
      [IDL.Vec(IDL.Record({ dev: IDL.Principal, pair: IDL.Principal }))],
      ['query']
    ),
    debug_fetchCompData: IDL.Func([IDL.Opt(IDL.Nat)], [], []),
    debug_updateLiquidity: IDL.Func([], [], []),
    delDex: IDL.Func([IDL.Principal], [], []),
    drc207: IDL.Func([], [DRC207Support], ['query']),
    dropListingReferrer: IDL.Func([IDL.Principal], [], []),
    getConfig: IDL.Func([], [Config], ['query']),
    getCurrencies: IDL.Func([], [IDL.Vec(TokenInfo__1)], ['query']),
    getDAO: IDL.Func(
      [],
      [IDL.Record({ DAO: IDL.Principal, DAO_BOARD: IDL.Principal })],
      ['query']
    ),
    getDexCompetition: IDL.Func(
      [IDL.Nat],
      [IDL.Opt(DexCompetitionResponse)],
      ['query']
    ),
    getDexCompetitionRound: IDL.Func([], [IDL.Nat], ['query']),
    getDexCompetitionTrader: IDL.Func(
      [IDL.Nat, Address],
      [IDL.Opt(IDL.Vec(TraderData))],
      ['query']
    ),
    getDexCompetitionTraders: IDL.Func(
      [IDL.Nat, IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
      [TrieList_3],
      ['query']
    ),
    getDexCompetitions: IDL.Func(
      [IDL.Opt(DexName), IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
      [TrieList_2],
      ['query']
    ),
    getDexList: IDL.Func(
      [],
      [IDL.Vec(IDL.Tuple(DexName, IDL.Principal))],
      ['query']
    ),
    getPairListingReferrers: IDL.Func(
      [PairCanisterId],
      [IDL.Bool, IDL.Vec(IDL.Tuple(ListingReferrer__1, Time, TokenIdentifier))],
      ['query']
    ),
    getPairs: IDL.Func(
      [IDL.Opt(DexName), IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
      [TrieList],
      ['query']
    ),
    getPairs2: IDL.Func(
      [
        IDL.Opt(DexName),
        IDL.Opt(IDL.Principal),
        IDL.Opt(IDL.Nat),
        IDL.Opt(IDL.Nat)
      ],
      [TrieList_1],
      ['query']
    ),
    getPairsByMarket: IDL.Func(
      [IDL.Text, IDL.Opt(DexName), IDL.Opt(IDL.Nat), IDL.Opt(IDL.Nat)],
      [TrieList],
      ['query']
    ),
    getPairsByToken: IDL.Func(
      [IDL.Principal, IDL.Opt(DexName)],
      [IDL.Vec(IDL.Tuple(PairCanisterId, TradingPair))],
      ['query']
    ),
    getTokenMetadata: IDL.Func(
      [IDL.Principal],
      [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
      ['query']
    ),
    getTokens: IDL.Func([IDL.Opt(DexName)], [IDL.Vec(TokenInfo__1)], ['query']),
    listingReferrer: IDL.Func([IDL.Principal], [IDL.Bool, IDL.Bool], ['query']),
    propose: IDL.Func([PairCanisterId], [], []),
    pushCompetitionByDex: IDL.Func(
      [
        IDL.Opt(IDL.Nat),
        IDL.Text,
        IDL.Text,
        Time,
        Time,
        IDL.Vec(
          IDL.Tuple(
            DexName,
            IDL.Principal,
            IDL.Variant({ token0: IDL.Null, token1: IDL.Null })
          )
        )
      ],
      [IDL.Nat],
      []
    ),
    put: IDL.Func([PairInfo__1, IDL.Nat], [], []),
    putByDex: IDL.Func([TokenInfo__1, TokenInfo__1, IDL.Principal], [], []),
    putCurrency: IDL.Func([TokenInfo__1], [], []),
    putPairToMarket: IDL.Func([IDL.Text, PairCanisterId], [], []),
    registerDexCompetition: IDL.Func(
      [IDL.Opt(IDL.Vec(IDL.Nat8))],
      [IDL.Bool],
      []
    ),
    remove: IDL.Func([IDL.Principal], [], []),
    removeByDex: IDL.Func([IDL.Principal], [], []),
    removeCurrency: IDL.Func([IDL.Principal], [], []),
    removePairFromMarket: IDL.Func([IDL.Opt(IDL.Text), PairCanisterId], [], []),
    removeTokenMetadata: IDL.Func(
      [IDL.Principal, IDL.Opt(IDL.Text)],
      [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text))],
      []
    ),
    route: IDL.Func(
      [IDL.Principal, IDL.Principal, IDL.Opt(DexName)],
      [IDL.Vec(IDL.Tuple(PairCanisterId, TradingPair))],
      ['query']
    ),
    setDex: IDL.Func([DexName, IDL.Principal], [], []),
    setListingReferrerByNft: IDL.Func([IDL.Text, IDL.Text], [], []),
    setScore: IDL.Func([IDL.Principal, IDL.Nat], [], []),
    sync: IDL.Func([], [], []),
    sys_burn: IDL.Func([IDL.Nat], [], []),
    sys_withdraw: IDL.Func(
      [IDL.Principal, TokenStd, IDL.Principal, IDL.Nat],
      [],
      []
    ),
    timerStart: IDL.Func([IDL.Nat], [], []),
    timerStop: IDL.Func([], [], []),
    verifyListingReferrer: IDL.Func(
      [IDL.Principal, IDL.Text, IDL.Bool],
      [],
      []
    ),
    version: IDL.Func([], [IDL.Text], ['query']),
    wallet_receive: IDL.Func([], [], [])
  });
};
