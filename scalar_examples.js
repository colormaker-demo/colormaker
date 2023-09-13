// Data generators: make up sample scalar field from random noise
function DataGenerator(field)
{

    this.field = field;
    this.data = field.view;
}
DataGenerator.prototype.generate = function(param) {
    console.error("DataGenerator abstract not implemented");
}

function TerrainGenerator(field)
{
    // note: terratin generator assumes w=h
    DataGenerator.call(this, field);
    this.terrainGen = new Terrain(Math.log2(field.w-1), this.data);
}
TerrainGenerator.prototype = Object.create(DataGenerator)
TerrainGenerator.prototype.generate = function(param)
{
    this.terrainGen.generate(.5);
}

function NoiseGenerator(field, noiseScale)
{
    DataGenerator.call(this, field);
    this.noiseScale = noiseScale;
}
NoiseGenerator.prototype = Object.create(DataGenerator)
NoiseGenerator.prototype.generate = function()
{
    seedNoise();
    makeNoise(this.field, this.noiseScale)
}

function SineGenerator(field)
{
    DataGenerator.call(this, field);
    this.noiseScale = noiseScale;
}
SineGenerator.prototype = Object.create(DataGenerator)
SineGenerator.prototype.generate = function()
{
    // how many sine waves to generate?
    var FREQ = 4;
    var field = this.field;
    var data = this.field.view;
    var cycle = Math.min(field.w, field.h) / FREQ;

    for (var I=0, r=0; r<field.h; r++)
    {
        var rCycle = r/cycle
        var impulseRow = Math.sin(rCycle * 2 * Math.PI);
        for (var c=0; c<field.w; c++, I++)
        {
            var cCycle = c/cycle;
            var scale = 1;

            // create a dimple between cycles 2-3
            if (rCycle >= 2 && rCycle <= 3 && cCycle >= 2 && cCycle <= 3) {
                var d = Math.sqrt(Math.pow(rCycle-2.5,2)+Math.pow(cCycle-2.5,2));
                if (d <= .6) {
                    scale = 1-.8 * ((.6-d)/.6);
                }
            }
            var impulseCol = Math.sin(cCycle * 2 * Math.PI);
            data[I] = scale * (impulseRow+impulseCol);

        }
    }
}



function ScalarExamples(canvases)
{
    this.canvases = [];
    this.fields = [];
    this.visualizers = [];
    this.generators = [];

    for (var i=0; i<canvases.length; i++)
    {
        var canvas = canvases[i];
        var w = canvas.width;
        var h = canvas.height;

        // create scalar field
        var field = new ScalarField(w, h);
        this.fields.push(field);
        this.canvases.push(canvas);

        // create a visualizer pairing the field
        // with the canvas
        var vis = new ScalarVis(field, canvas);
        this.visualizers.push(vis);

        // data generator
        var gen = null;
        switch (i)
        {
        case 0:
            gen = new NoiseGenerator(field, 1);
            break;
        case 1:
            gen = new NoiseGenerator(field, 3);
            break;
        case 2:
            gen = new SineGenerator(field);
            break;
        default:
            gen = new TerrainGenerator(field);
            break;
        }
        this.generators.push(gen);
    }
    this.refresh();
}

ScalarExamples.prototype.refresh = function()
{
    for (var i=0; i<this.generators.length; i++) {
        this.generators[i].generate();
        this.fields[i].normalize();

        // flag that data has been updated
        this.fields[i].updated();
        this.visualizers[i].vis();
    }
}

ScalarExamples.prototype.setColorMap = function(colormap)
{
    ScalarVis.setUniversalColormap(colormap)
}

// Combine the map modules into a single module
var combinedMapModule = (function() {
    var unemploymentMap1 = d3.map();
    var unemploymentMap2 = d3.map();
    var svg_map1, svg_map2;

    // create the choropleth svg for map1
    function createChoroplethMap1(callback) {
        d3.select('div#map1 svg').remove();

        // load the csv file
        d3.csv("profile/unemployment.csv").then(function(data) {
            data.forEach(function(d) {
                unemploymentMap1.set(d.id, +d.rate);
            });
            // load svg
            d3.xml("profile/mod.svg")
                .then(function(xml) {
                    var importedNode = document.importNode(xml.documentElement, true);
                    svg_map1 = d3.select(importedNode);
                    d3.select('div#map1')
                        .node()
                        .appendChild(svg_map1.node());
                    if (typeof callback === "function") {
                        callback();
                    }
                })
                .catch(function(error) {
                    throw error;
                });
        });
    }

    // create the choropleth svg for map2
    function createChoroplethMap2(callback) {
        d3.select('div#map2 svg').remove();
        // get the svg image
        d3.xml("profile/new.svg")
            .then(function(xml) {
                var importedNode = document.importNode(xml.documentElement, true);
                svg_map2 = d3.select(importedNode);
                d3.select('div#map2')
                    .node()
                    .appendChild(svg_map2.node());
                svg_map2.selectAll("path")
                    .each(function(d, i) {
                        var randomRate;
                        if (i >= 1500) {
                            randomRate = parseFloat(Math.random() * 50);            // random values
                        } else {
                            var rangeSize = 30;
                            var rangeStart = Math.floor(i / rangeSize) * 1;         // start value for each range
                            var rangeEnd = rangeStart + 1;                          // end value for each range
                            randomRate = parseFloat(Math.random() * (rangeEnd - rangeStart) + rangeStart);
                        }
                        unemploymentMap2.set(i, randomRate);
                    });
                    if (typeof callback === "function") {
                        callback();
                    }
            })
            .catch(function(error) {
                throw error;
            });
    }
    // update choropleth w/ colormap for map1
    function updateChoroplethMap1(cmap) {
        var colormapLab = cmap?.colorMap ?? [
            { value: 0, lab: { l: 0, a: 0, b: 0} },
            { value: 1, lab: { l: 100, a: 0, b: 0} }
        ];
        var colormapHex = colormapLab.map(function(color) {
            var labColor = d3.lab(color.lab.l, color.lab.a, color.lab.b);
            return labColor.hex();
        });
        var colorScale = d3.scaleSequential()
                            .domain([Math.min(...Array.from(unemploymentMap1.values())), Math.max(...Array.from(unemploymentMap1.values()))])
                            .interpolator(d3.interpolateRgbBasis(colormapHex));
        var countyID = unemploymentMap1.keys();
        svg_map1.selectAll("path")
            .attr("fill", function(d, i) {
                var rate = unemploymentMap1.get(countyID[i]);
                return rate ? colorScale(rate) : "gray";
            });
    }
    // update choropleth w/ colormap for map2
    function updateChoroplethMap2(cmap) {
        var colormapLab = cmap?.colorMap ?? [
            { value: 0, lab: { l: 0, a: 0, b: 0} },
            { value: 1, lab: { l: 100, a: 0, b: 0} }
        ];
        var colormapHex = colormapLab.map(function(color) {
            var labColor = d3.lab(color.lab.l, color.lab.a, color.lab.b);
            return labColor.hex();
        });
        var colorScale = d3.scaleSequential()
                            .domain([Math.min(...Array.from(unemploymentMap2.values())), Math.max(...Array.from(unemploymentMap2.values()))])
                            .interpolator(d3.interpolateRgbBasis(colormapHex));
        svg_map2.selectAll("path")
            .attr("fill", function(d, i) {
                var rate = unemploymentMap2.get(i);
                return rate ? colorScale(rate) : "gray";
            });
    }
    return {
        createChoroplethMap1: createChoroplethMap1,
        createChoroplethMap2: createChoroplethMap2,
        updateChoroplethMap1: updateChoroplethMap1,
        updateChoroplethMap2: updateChoroplethMap2
    };
})();
