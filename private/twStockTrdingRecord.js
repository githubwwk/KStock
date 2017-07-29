/* Copyright (c) 2017 konrad.wei@gmail.com */

"use strict"
var moment = require('moment');
var wait = require('wait.for');
var db = require("./db.js");

/* 放空 */
var reason_of_shortSell = ['搶先賣(高檔有主力出貨)', 
                           '賣1(跌過末漲低高)', 
                           '賣2(反彈後再跌過末漲低)', 
                           '連續上漲後爆大量收上引線(觀察3日以上)',
                           'MA5,10,20,60糾結後帶量黑K下跌']; 

/* 做多 */                           
var reason_of_longBuy = ['搶先買(低檔有主力吃貨)', 
                         '買1(漲過末跌高)', 
                         '買2(回測後再過末跌高)',
                         '連續下跌後爆大量收下引線(觀察3日以上)',
                         'MA5,10,20,60糾結後帶量紅K上漲']; 

/* 放空犯的錯誤 */
var error_of_shortSell = ['MA60向上彎時做空',
                          '空在波段低點，一進場就虧損',
                          '低檔創新低，盤中追空',
                          '大盤轉多做空',
                          '開盤1小時內做空(方向未明)'];

/* 做多犯的錯誤 */
var error_of_longBuy = ['MA60下彎時做多',
                        '買在波段高點，一進場就虧損',
                        '高檔創新高，盤中追高',
                        '大盤轉空做多',
                        '開盤1小時內做多(方向未明)'];

/* 交易共通的錯誤 */
var error_of_tradingCommon = ['未遵守交易策略',
                              '未出現明確方向時交易',
                              '看不懂的走勢進行買賣',
                              '只憑感覺',
                              '只憑消息面',
                              '交易部位太大(張數、金額)',
                              '未等3日觀察',
                              '遇整數關卡進場'];

function _f_get_reason_of_trading()
{
    let result = {};

    result.reason_of_shortSell = reason_of_shortSell;
    result.reason_of_longBuy = reason_of_longBuy;
    result.error_of_shortSell = error_of_shortSell;
    result.error_of_longBuy = error_of_longBuy;
    result.error_of_tradingCommon = error_of_tradingCommon;

    return result;
}

exports.getReasonOfTradingList = _f_get_reason_of_trading;