var colors = {};
var charts = {};

function randomColor() {
  var o = Math.round, r = Math.random, s = 245;
  return [o(r()*s), o(r()*s), o(r()*s)];
}

function getColor(name) {
    name = name.toLowerCase();
    if (colors[name] == null) colors[name] = randomColor();
    return colors[name];
}

function createPriceDataConfig(company, prices, color=getColor(company)) {
    return {
        label: company,
        backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.5)`,
        borderColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
        data: prices,
        lineTension: 0,
        pointRadius: 0,
        pointHoverBorderWidth: 2,
        pointHoverBackgroundColor: 'rgb(255,255,255)'
  };
}

function createBarDataConfig(company, values, color=randomColor()) {
  return {
      type: 'bar',
      label: company,
      backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.5)`,
      borderColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      borderWidth: 2,
      hoverBorderWidth: 5,
      yAxisID: 'bar',
      xAxisID: 'x',
      data: values,
  };
}

function createLineDataConfig(company, values, color=randomColor()) {
  return {
      type: 'line',
      label: company,
      borderColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      yAxisID: 'line',
      backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.25)`,
      fill: 'origin',
      borderDash: [15, 5],
      lineTension: 0,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`,
      pointHoverBorderWidth: 2,
      pointHoverBackgroundColor: 'rgb(255,255,255)',
      xAxisID: 'x',
      data: values,
  };
}

function createSolidLineDataConfig(company, values, color=randomColor(), radius=3) {
  return {
      type: 'line',
      label: company,
      borderColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})`,
      yAxisID: 'line',
      backgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.4)`,
      fill: 'origin',
      pointRadius: radius,
      pointHoverRadius: 5,
      pointBackgroundColor: `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.8)`,
      pointHoverBorderWidth: 2,
      pointHoverBackgroundColor: 'rgb(255,255,255)',
      xAxisID: 'x',
      data: values,
  };
}

// ---------- Income Statement Line Item Charts ----------

//args: [type, suggestedMax, suggestedMin]
function createISLineandBarOptions(args) {
    return {
        title: {text: `${args[0]} - Annual`,display: true},
        maintainAspectRatio: false,
        scales: {
            xAxes: [{id: 'x', type: 'time', offset: true, time: { unit: 'month', tooltipFormat: 'll', stepSize: 3}}],
            yAxes: [
                {id: 'line',position: 'right', offset: true, scaleLabel: {display: true, labelString: 'YoY Change'}, ticks: {
                    suggestedMin: 0, suggestedMax: args[1], callback:
                    function(value, index, values) {return value + '%';}
                }},
                {id: 'bar',position: 'left', scaleLabel: {display: true, labelString: `${args[0]}`}, offset: true, ticks: {suggestedMin: args[2], callback:
                    function(value, index, values) {
                        if (Math.abs(value) >= 1000000000) value = (value/1000000000).toFixed(1) + 'B';
                        else if (Math.abs(value) >= 1000000) value = (value/1000000).toFixed(1) + 'M';
                        else if (Math.abs(value) >= 1000) value = (value/1000).toFixed(1) + 'K';
                        return '$' + value;}
                }}
            ]
        },
        hover: {animationDuration: 0, intersect: false, mode: 'nearest', axis: 'x'},
        tooltips: {intersect: false, mode: 'nearest', axis: 'x'}
    };
}

//Standard chart used for all income statement line item charts
function createISLineandBar(type, data, charts, options) {
    let title = type.replace(/_/g, " ");

    if (!$(`.${type}_div`).length) {
        $('#dashboard').append($(`<div class="${type}_div lineAndBar"><canvas id="${type}_a"></canvas></div>`));
        $('#dashboard').append($(`<div class="${type}_div lineAndBar"><canvas id="${type}_q"></canvas></div>`));
        //Annual Chart
        let ctx = document.getElementById(`${type}_a`).getContext('2d');
        let color = getColor(data.name);
        charts[`${type}_a`] = new Chart(ctx, {
            data: {
                type: 'bar',
                datasets: [createLineDataConfig(`${data.name} %`, data.annual_change, color),
                           createBarDataConfig(`${data.name} $`, data.annual, color)]
            },
            options: options
        });
        //Quarterly Chart
        ctx = document.getElementById(`${type}_q`).getContext('2d');
        charts[`${type}_q`] = new Chart(ctx, {
            data: {
                type: 'bar',
                datasets: [createLineDataConfig(`${data.name} %`, data.quarterly_change, color),
                           createBarDataConfig(`${data.name} $`, data.quarterly, color)]
            },
            options: options
        });
        charts[`${type}_q`].options.title.text = `${title} - Quarterly`;
        charts[`${type}_q`].update();

    } else {
        let color = getColor(data.name);
        charts[`${type}_a`].data.datasets.push(createLineDataConfig(`${data.name} %`, data.annual_change, color));
        charts[`${type}_a`].data.datasets.push(createBarDataConfig(`${data.name} $`, data.annual, color));
        charts[`${type}_a`].update();
        charts[`${type}_q`].data.datasets.push(createLineDataConfig(`${data.name} %`, data.quarterly_change, color));
        charts[`${type}_q`].data.datasets.push(createBarDataConfig(`${data.name} $`, data.quarterly, color));
        charts[`${type}_q`].update();
    }
}

//args: [type, suggestedMax]
function createISLineOptions(args) {
    return {
        title: {text: `${args[0]} - Annual`,display: true},
        maintainAspectRatio: false,
        scales: {
            xAxes: [{id: 'x', type: 'time', offset: true, time: { unit: 'month', tooltipFormat: 'll', stepSize: 3}}],
            yAxes: [
                {id: 'line',position: 'left', scaleLabel: {display: true, labelString: `${args[0]}`}, offset: true,
                ticks: {suggestedMin: 0, suggestedMax: args[1], callback:function(value, index, values) {return value + '%';}}}
            ]
        },
        hover: {animationDuration: 0, intersect: false, mode: 'nearest', axis: 'x'},
        tooltips: {intersect: false, mode: 'nearest', axis: 'x'}
    };
}

function createISLine(type, data, charts, options) {
    //Remove underscores for readability
    let title = type.replace(/_/g, " ");

    if (!$(`.${type}_div`).length) {
        $('#dashboard').append($(`<div class="${type}_div line"><canvas id="${type}_a"></canvas></div>`));
        $('#dashboard').append($(`<div class="${type}_div line"><canvas id="${type}_q"></canvas></div>`));
        //Annual Chart
        let ctx = document.getElementById(`${type}_a`).getContext('2d');
        let color = getColor(data.name);
        charts[`${type}_a`] = new Chart(ctx, {
            data: {
                type: 'line',
                datasets: [createSolidLineDataConfig(`${data.name}`, data.annual_margin, color)]
            },
            options: options
        });
        //Quarterly Chart
        ctx = document.getElementById(`${type}_q`).getContext('2d');
        charts[`${type}_q`] = new Chart(ctx, {
            data: {
                type: 'line',
                datasets: [createSolidLineDataConfig(`${data.name}`, data.quarterly_margin, color)]
            },
            options: options
        });
        charts[`${type}_q`].options.title.text = `${title} - Quarterly`;
        charts[`${type}_q`].update();

    } else {
        let color = getColor(data.name);
        charts[`${type}_a`].data.datasets.push(createSolidLineDataConfig(`${data.name}`, data.annual_margin, color));
        charts[`${type}_a`].update();
        charts[`${type}_q`].data.datasets.push(createSolidLineDataConfig(`${data.name}`, data.quarterly_margin, color));
        charts[`${type}_q`].update();
    }
}

// -------- Other Charts -------
function createValuationOptions(type, header='') {
    return {
        title: {text: `${type}`,display: true},
        maintainAspectRatio: false,
        scales: {
            xAxes: [{id: 'x', type: 'time', offset: true, time: { unit: 'week', tooltipFormat: 'll', stepSize: 3}}],
            yAxes: [
                {id: 'line',position: 'left', scaleLabel: {display: true, labelString: `${type}`}, offset: true,
                ticks: {suggestedMin: 0, callback:
                    function(value, index, values) {
                        if (Math.abs(value) >= 1000000000) value = (value/1000000000).toFixed(1) + 'B';
                        else if (Math.abs(value) >= 1000000) value = (value/1000000).toFixed(1) + 'M';
                        else if (Math.abs(value) >= 1000) value = (value/1000).toFixed(1) + 'K';
                        return header + value;}
                }}
            ]
        },
        hover: {animationDuration: 0, intersect: false, mode: 'nearest', axis: 'x'},
        tooltips: {intersect: false, mode: 'nearest', axis: 'x'}
    };
}

function createValuation(type, data, charts, options) {

    if (!$(`#${type}`).length) {
        $('#dashboard').append($(`<div class="full-width"><canvas id="${type}"></canvas></div>`));
        //Annual Chart
        let ctx = document.getElementById(`${type}`).getContext('2d');
        let color = getColor(data.name);
        charts[`${type}`] = new Chart(ctx, {
            data: {
                type: 'line',
                datasets: [createSolidLineDataConfig(`${data.name}`, data.values, color, 0)]
            },
            options: options
        });

    } else {
        let color = getColor(data.name);
        charts[`${type}`].data.datasets.push(createSolidLineDataConfig(`${data.name}`, data.values, color, 0));
        charts[`${type}`].update();
    }
}

async function earnings_chart(comp) {
    let data = await get_earnings(comp);
    let options = createISLineandBarOptions(['Earnings', 250, -1000]);
    createISLineandBar('Earnings', data, charts, options);
    options = createISLineOptions(['Net Income Margin', 50]);
    createISLine('Net_Income_Margin', data, charts, options);
}

async function revenue_chart(comp) {
    let data = await get_revenue(comp);
    let options = createISLineandBarOptions(['Revenue', 100, 0]);
    createISLineandBar('Revenue', data, charts, options);
};

async function operating_profit_chart(comp) {
    let data = await get_operating_profit(comp);
    let options = createISLineandBarOptions(['Operating Profit', 150, 0]);
    createISLineandBar('Operating_Profit', data, charts, options);
    options = createISLineOptions(['Operating Margin', 50]);
    createISLine('Operating_Margin', data, charts, options);
};

async function gross_profit_chart(comp) {
    let data = await get_gross_profit(comp);
    let options = createISLineandBarOptions(['Gross Profit', 150, 0]);
    createISLineandBar('Gross_Profit', data, charts, options);
    options = createISLineOptions(['Gross Margin', 50]);
    createISLine('Gross_Margin', data, charts, options);
};

async function pe_chart(comp) {
    let data = await get_pe(comp);
    options = createValuationOptions('PE Ratio');
    createValuation('PE_Ratio', data, charts, options);
    console.log(data.name + " Pe chart data: ");
    console.log(data);
};

async function price_sales_chart(comp) {
    let data = await get_ps(comp);
    options = createValuationOptions('P/S Ratio');
    createValuation('PS_Ratio', data, charts, options);
    console.log(data.name + " P/S chart data: ");
    console.log(data);
};

async function market_cap_chart(comp) {
    let data = await get_market_cap(comp);
    options = createValuationOptions('Market Cap', '$');
    createValuation('Market_Cap', data, charts, options);
    console.log(data.name + " market cap data: ");
    console.log(data);
};

async function display_all(comp) {
    await market_cap_chart(comp);
    await price_sales_chart(comp);
    await pe_chart(comp);
    await revenue_chart(comp);
    await gross_profit_chart(comp);
    await operating_profit_chart(comp);
    await earnings_chart(comp);
}

//Main dashboard handling
$(function () {
    //Setup and initialization
    // var socket = io();
    var p_chart;
    var earnings_chart_a;
    var earnings_chart_q;
    Chart.defaults.global.title.fontSize = 16;

    $('form').submit(function(e){
      e.preventDefault();
      var comp = $('#ticker').val();
      if (comp == "") return false;

      display_all(comp);

      $('#ticker').val('');

      return false;
    });

    //  CODE FOR LISTENING TO NODE JS SERVER (THINGPEDIA INTEGRATION)

    // socket.on('clear', () => {
    //     $("#dashboard").empty();
    // });
    //
    // socket.on('price chart', function(data){
    //     //If chart doesn't exist
    //     if (!$('#price').length) {
    //         $('#dashboard').append($('<div class="full-width-large"><canvas id="price"></canvas></div>'));
    //         let ctx = document.getElementById('price').getContext('2d');
    //         p_chart = new Chart(ctx, {
    //             type: 'line',
    //             data: {
    //                 datasets: [createPriceDataConfig(data.name, data.prices)]
    //             },
    //             options: {
    //                 maintainAspectRatio: false,
    //                 scales: { xAxes: [{type: 'time', time: { unit: 'week', tooltipFormat: 'll'}}],
    //                           yAxes: [{scaleLabel: {display: true, labelString: 'Adjusted Closing Price'}, ticks: {callback:function(value, index, values) {return '$' + value;}}}] },
    //                 hover: { animationDuration: 0, intersect: false, mode: 'nearest', axis: "x" },
    //                 tooltips: {intersect: false, mode: 'nearest', axis: "x", //callbacks: {beforeLabel: function(tooltipItem, data) {return '$';}}
    //                 },
    //                 title: {text: "Stock Chart",display: true}
    //             }
    //         });
    //       //Add to existing chart as another dataset
    //       } else {
    //           p_chart.data.datasets.push(createPriceDataConfig(data.name, data.prices));
    //           p_chart.update();
    //       }
    // });
    //
    // socket.on('earnings chart', function(data) {
    //   let options = createISLineandBarOptions(['Earnings', 250, -1000]);
    //   createISLineandBar('Earnings', data, charts, options);
    //   options = createISLineOptions(['Net Income Margin', 50]);
    //   createISLine('Net_Income_Margin', data, charts, options);
    // });
    //
    // socket.on('revenue chart', function(data) {
    //     let options = createISLineandBarOptions(['Revenue', 100, 0]);
    //     createISLineandBar('Revenue', data, charts, options);
    // });
    //
    // socket.on('operating profit chart', function(data) {
    //     let options = createISLineandBarOptions(['Operating Profit', 150, 0]);
    //     createISLineandBar('Operating_Profit', data, charts, options);
    //     options = createISLineOptions(['Operating Margin', 50]);
    //     createISLine('Operating_Margin', data, charts, options);
    // });
    //
    // socket.on('gross profit chart', function(data) {
    //     let options = createISLineandBarOptions(['Gross Profit', 150, 0]);
    //     createISLineandBar('Gross_Profit', data, charts, options);
    //     options = createISLineOptions(['Gross Margin', 50]);
    //     createISLine('Gross_Margin', data, charts, options);
    // });
    //
    // socket.on('pe chart', function(data) {
    //     options = createValuationOptions('PE Ratio');
    //     createValuation('PE_Ratio', data, charts, options);
    //     console.log(data.name + " Pe chart data: ");
    //     console.log(data);
    // });
    //
    // socket.on('price sales chart', function(data) {
    //     options = createValuationOptions('P/S Ratio');
    //     createValuation('PS_Ratio', data, charts, options);
    //     console.log(data.name + " P/S chart data: ");
    //     console.log(data);
    // });
    //
    // socket.on('market cap chart', function(data) {
    //     options = createValuationOptions('Market Cap', '$');
    //     createValuation('Market_Cap', data, charts, options);
    //     console.log(data.name + " market cap data: ");
    //     console.log(data);
    // });
});
