function mean(arr, accessor)
{
    var m = 0;
    for (var i=0, len=arr.length; i<len; i++)
    {
        m += accessor ? accessor(arr[i]) : arr[i];
    }
    if (arr.length > 0) {
        m /= arr.length;
    }
    return m;
}

function std(arr, accessor)
{
    var m = mean(arr, accessor);
    var sigma = 0;
    for (var i=0, len=arr.length; i<len; i++) {
        var x = accessor ? accessor(arr[i]) : arr[i];
        var d = Math.pow(m-x, 2);
        sigma += d;
    }
    if (arr.length > 1) {
        return Math.sqrt(sigma / (arr.length-1));
    } else {
        return 0;
    }
}

var SIM_ITER = 100;
function simulate(costFunc, _opt)
{
    var consoleLog = console.log;
    console.log = function() {};

    if (!_opt) {
        // get global optimizer
        _opt = opt
    }
    if (!costFunc) {
        costFunc = perceptualUniformityPenalty;
    }

    var results = [];
    for (var sam=10; sam<=200; sam += 10)
    {

        var curResults = [];
        SAMPLE_PERCEPT = sam;

        for (var iter=0; iter<SIM_ITER; iter++)
        {
            var solution = _opt.run();
            var cost = costFunc(solution);
            curResults.push(cost);
        }
        consoleLog("sample " + sam + '/' + 200);

        results.push({ sampleSize: sam, results: curResults});
    }
    console.log = consoleLog;

    for (var r = 0; r<results.length; r++)
    {
        var m = mean(results[r].results);
        var sigma = std(results[r].results);

        var r1 = m - sigma * 2;
        var r2 = m - sigma;
        var r3 = m + sigma;
        var r4 = m + sigma * 2;
        console.log("smpl " + results[r].sampleSize + ": "
            + r1.toFixed(2) + ' ' + r2.toFixed(2) + ' [' + m.toFixed(2) + '] '
            + r3.toFixed(2) + ' ' + r4.toFixed(2)
        );
    }
    return results;


}
