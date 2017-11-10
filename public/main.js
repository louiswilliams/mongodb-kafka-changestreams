$(function () {
    var socket = io('/marketData');
    socket.on('price', function(data) {
        processData(data);
    });

    var latest = {};
    var $data = $("#data");

    function processData(data) {
        var now = new Date();
        var upstreamLag = data.lag;
        var totalLag = now.getTime() - (new Date(data.date)).getTime();
        var myLag = totalLag - upstreamLag;
        var symbol = latest[data.symbol];
        if (!symbol) symbol = {};
        var prev = (symbol.close) ? symbol.close : 0;
        symbol.prev = "was " + ((prev) ? prev : "-");
        symbol.close = data.close;
        symbol.date = myLag + "ms from producer<br>" + totalLag + "ms from MongoDB";
        latest[data.symbol] = symbol;

        // ALter HTML
        $symb = $(".symbol[data-symbol=" + data.symbol + "]");

        $close = $symb.find('.close');
        $close.html(symbol.close);
        if (data.close >= prev) {
            $close.addClass("stockUp");
            $close.removeClass("stockDown");
        } else {
            $close.removeClass("stockUp");
            $close.addClass("stockDown");
        }

        $symb.find('.name').html(data.symbol);
        $symb.find('.date').html(symbol.date);
        $symb.find('.last').html(symbol.prev);

    }
});
