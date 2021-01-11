// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Author: James zhuang <james.zhuang@cs.stanford.edu>
"use strict";

const URL = "https://www.alphavantage.co/query?function=";
const API_KEY = "VPJXG30AV7OQAM22";
let cache = {};


//Pulls data from AlphaVantage or local cache
async function alphavantage(company, func, config = '&apikey=') {
    if (cache[company] == null || cache[company][func] == null) {
        let url = `${URL}${func}&symbol=${company}${config}${API_KEY}`;
        let result = await $.getJSON(url, function (data, status) { return data;});
        
        if (cache[company] == null){
            cache[company] = {};
            cache[company][func] = result;
        } else {
            cache[company][func] = result;
        }

        return result;

    } else return cache[company][func];

}

//Gets historical, share split adjusted stock prices
//Returns prices [x:date, y:value] for visualizations and {display} date:value pairs for thingtalk
//API: https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&outputsize=full&apikey=demo

async function prices (company) {
    // let parsed = await alphavantage(company, "TIME_SERIES_DAILY_ADJUSTED", "&outputsize=full&apikey=");
    // parsed = parsed["Time Series (Daily)"];
    let parsed = await alphavantage(company, "TIME_SERIES_WEEKLY_ADJUSTED", "&outputsize=full&apikey=");
    parsed = parsed["Weekly Adjusted Time Series"];
    let prices = [];
    let display = {};
    for (const date in parsed) {
        // display[date] = parsed[date]["4. close"]; (True historical values)
        display[date] = parsed[date]["5. adjusted close"];
        prices.push({x: moment(date), y: parsed[date]["5. adjusted close"]});
    }
    return {prices: prices, display: display};
}

async function get_price(company) {
    let parsed = await alphavantage(company, "GLOBAL_QUOTE");
    while (parsed == null) parsed = await alphavantage(company, "GLOBAL_QUOTE");
    let historical = await prices(company);
    //Reverse so that the oldest dates are first (displayed on the right). May no longer be necessary due to using time axis
    return {name: company, prices: historical.prices.slice().reverse()};
}

async function pull_market_cap (company) {
    let prices = await alphavantage(company, "TIME_SERIES_WEEKLY_ADJUSTED", "&outputsize=full&apikey=");
    prices = prices["Weekly Adjusted Time Series"];

    while(prices == null) {
        prices = await alphavantage(company, "TIME_SERIES_WEEKLY_ADJUSTED", "&outputsize=full&apikey=");
        prices = prices["Weekly Adjusted Time Series"];
    }

    let shares = await alphavantage(company, "OVERVIEW");
    while (shares == null) shares = await alphavantage(company, "OVERVIEW");
    shares = shares.MarketCapitalization/prices[Object.keys(prices)[0]]["5. adjusted close"];

    let chart_data = {name: company, values: []};
    let display = {};
    for (const date in prices) {
        let value = prices[date]["5. adjusted close"]*shares;
        value = value.toFixed(0);
        // let thing = prices[date]["5. adjusted close"];
        display[date] = value;
        chart_data.values.push({x: moment(date), y: value});
    }
    return {chart_data: chart_data, display: display};
}

async function get_market_cap(company) {
    let historical = await pull_market_cap(company);
    return historical.chart_data;
}

//Helper function for formatting % changes
function calc_change(curr, prev, precision=1) {
    if (Math.abs(prev) < 1) return NaN;
    let change = 100*(curr/prev - 1);
    if (prev < 0) change = -change;
    if (Math.abs(change) > 1500) return NaN;      //Number not meaningful
    return change.toFixed(precision);
}

//API: https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=IBM&apikey=demo
//Helper function to return data for any line item in income INCOME_STATEMENT
//Returns: annual date:value pairs, quarterly date:value pairs, and chart_data [x:date, y:value]
//for quarterly and annual numbers on an absolute and % change basis
//chart_data: {name: (company),
//             annual, annual_change, annual_margin, quarterly, quarterly_change, quarterly_margin}
async function pullIncomeStatementItem(company, item, margin="totalRevenue") {
    let parsed = await alphavantage(company, "INCOME_STATEMENT");
    while (parsed.annualReports == null) {
        parsed = await alphavantage(company, "INCOME_STATEMENT");
    }
    let annual = {};
    let quarterly = {};
    let chart_data = {name: company, annual: [], annual_change: [], annual_margin: [],
                      quarterly: [], quarterly_change: [], quarterly_margin: []};

    let previous = null;
    //slice() first to prevent mutating our cache
    parsed.annualReports.slice().reverse().forEach(obj => {
        let date = obj.fiscalDateEnding;
        let revenue = obj[margin];
        let lineItem = obj[item];
        annual[date] = lineItem;
        if (previous != null)
            chart_data.annual_change.push({x: moment(date), y: calc_change(lineItem, previous)});
        previous = lineItem;
        chart_data.annual.push({x: moment(date), y: lineItem});
        chart_data.annual_margin.push({x: moment(date), y: (lineItem/revenue * 100).toFixed(1)});
    });

    previous = [];
    parsed.quarterlyReports.slice().reverse().forEach(obj => {
        let date = obj.fiscalDateEnding;
        let revenue = obj[margin];
        let lineItem = obj[item];
        quarterly[date] = lineItem;
        if (previous.length > 3)
            chart_data.quarterly_change.push({x: moment(date), y: calc_change(lineItem, previous.shift())});
        previous.push(lineItem);
        chart_data.quarterly.push({x: moment(date), y: lineItem});
        chart_data.quarterly_margin.push({x: moment(date), y: (lineItem/revenue * 100).toFixed(1)});
    });
    return {annual: annual, quarterly: quarterly, chart_data: chart_data};
}

async function getValuation(company, type) {
    let market_cap = await pull_market_cap(company);
    market_cap = market_cap.display;
    let metric = await pullIncomeStatementItem(company, type);
    while(metric == null) {
        metric = await pullIncomeStatementItem(company, type);
    }

    let chart_data = {name: company, values: [], debug: [], metric: metric.quarterly};
    let display = {};
    let fy_dates = [];
    for (const date in metric.quarterly) {
        fy_dates.push(date);
    }
    fy_dates = fy_dates.slice().reverse(); // Reverse order so most recent is first

    //Starts with most recent
    for (const date in market_cap) {
        let price = market_cap[date];
        let d = moment(date);
        // starts from most recent
        let updated = 0;
        let TTM_metric = 0;
        let ttm_dates = "";
        for (let i = 0; i < fy_dates.length; ++i) {
            if (d.isAfter(fy_dates[i])) {
                ttm_dates += " "+fy_dates[i]+" ";
                TTM_metric += Number(metric.quarterly[fy_dates[i]]);
                updated += 1;
            }
            if (updated == 4) break;
        }
        if (updated != 4) break;
        else {
            chart_data.debug.push({date: d, price: price, ttm: TTM_metric, ttm_dates:ttm_dates})
            let ratio = price/TTM_metric;
            ratio = ratio.toFixed(2);
            chart_data.values.push({x: d, y: ratio});
            display[date] = ratio;
            updated = true;
        }
    }
    return {chart_data: chart_data, display: display}
}

async function get_pe(company) {
    let results = await getValuation(company, 'netIncomeFromContinuingOperations');
    return results.chart_data;
}

async function get_ps(company) {
    let results = await getValuation(company, 'totalRevenue');
    return results.chart_data;
}

async function get_revenue(company) {
    let results = await pullIncomeStatementItem(company, "totalRevenue");
    return results.chart_data;
}

async function get_earnings(company) {
    let results = await pullIncomeStatementItem(company, "netIncomeFromContinuingOperations");
    return results.chart_data;
}

async function get_ebitda(company) {
    let parsed = await alphavantage(company, "OVERVIEW");
    return [{ebitda: new Tp.Value.Currency(parsed["EBITDA"], 'usd')}];
}
async function get_operating_profit(company) {
    let results = await pullIncomeStatementItem(company, "operatingIncome");
    return results.chart_data;
}

async function get_gross_profit(company) {
    let results = await pullIncomeStatementItem(company, "grossProfit");
    return results.chart_data;
}
