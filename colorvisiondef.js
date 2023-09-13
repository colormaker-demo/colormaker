var colorVisionDeficiency = function() {
    var colorProfile = 'sRGB',
    gammaCorrection = 2.2;
    var matrixXyzRgb = [
      3.240712470389558, -0.969259258688888, 0.05563600315398933,
      -1.5372626602963142, 1.875996969313966, -0.2039948802843549,
      -0.49857440415943116, 0.041556132211625726, 1.0570636917433989
    ];
    var matrixRgbXyz = [
      0.41242371206635076, 0.21265606784927693, 0.019331987577444885,
      0.3575793401363035, 0.715157818248362, 0.11919267420354762,
      0.1804662232369621, 0.0721864539171564, 0.9504491124870351
    ];

    // xy: coordinates, m: slope, yi: y-intercept
    var blinder = {
        protan: {
            x: 0.7465,
            y: 0.2535,
            m: 1.273463,
            yi: -0.073894
        },
        deutan: {
            x: 1.4,
            y: -0.4,
            m: 0.968437,
            yi: 0.003331
        },
        tritan: {
            x: 0.1748,
            y: 0,
            m: 0.062921,
            yi: 0.292119
        },
        custom: {
            x: 0.735,
            y: 0.265,
            m: -1.059259,
            yi: 1.026914
        }
    };

    var convertRgbToXyz = function (o) {
        var M = matrixRgbXyz,
        z = {},
        R = o.R / 255,
        G = o.G / 255,
        B = o.B / 255;

        if (colorProfile === 'sRGB') {
            R = (R > 0.04045) ? Math.pow(((R + 0.055) / 1.055), 2.4) : R / 12.92;
            G = (G > 0.04045) ? Math.pow(((G + 0.055) / 1.055), 2.4) : G / 12.92;
            B = (B > 0.04045) ? Math.pow(((B + 0.055) / 1.055), 2.4) : B / 12.92;
        }
        else {
            R = Math.pow(R, gammaCorrection);
            G = Math.pow(G, gammaCorrection);
            B = Math.pow(B, gammaCorrection);
        }
        z.X = R * M[0] + G * M[3] + B * M[6];
        z.Y = R * M[1] + G * M[4] + B * M[7];
        z.Z = R * M[2] + G * M[5] + B * M[8];

        return z;
    };

    var convertXyzToXyy = function (o) {
        var n = o.X + o.Y + o.Z;
        if (n === 0) return {x: 0, y: 0, Y: o.Y};
        return {x: o.X / n, y: o.Y / n, Y: o.Y};
    };

    var Blind = function (rgb$$1, type, anomalize) {
        var z, v, n,
        line, c, slope,
        yi, dx, dy,
        dX, dY, dZ,
        dR, dG, dB,
        _r, _g, _b,
        ngx, ngz, M,
        adjust;

        if (type === "achroma") { // D65 in sRGB
            z = rgb$$1.R * 0.212656 + rgb$$1.G * 0.715158 + rgb$$1.B * 0.072186;
            z = {R: z, G: z, B: z};
            if (anomalize) {
                v = 1.75;
                n = v + 1;
                z.R = (v * z.R + rgb$$1.R) / n;
                z.G = (v * z.G + rgb$$1.G) / n;
                z.B = (v * z.B + rgb$$1.B) / n;
            }
            return z;
        }

        line = blinder[type];
        c = convertXyzToXyy(convertRgbToXyz(rgb$$1));
        // The confusion line is between the source color and the confusion point
        slope = (c.y - line.y) / (c.x - line.x);
        yi = c.y - c.x * slope; // slope, and y-intercept (at x=0)
        // Find the change in the x and y dimensions (no Y change)
        dx = (line.yi - yi) / (slope - line.m);
        dy = (slope * dx) + yi;
        dY = 0;
        // Find the simulated colors XYZ coords
        z = {};
        z.X = dx * c.Y / dy;
        z.Y = c.Y;
        z.Z = (1 - (dx + dy)) * c.Y / dy;
        // Calculate difference between sim color and neutral color
        ngx = 0.312713 * c.Y / 0.329016; // find neutral grey using D65 white-point
        ngz = 0.358271 * c.Y / 0.329016;
        dX = ngx - z.X;
        dZ = ngz - z.Z;
        // find out how much to shift sim color toward neutral to fit in RGB space
        M = matrixXyzRgb;
        dR = dX * M[0] + dY * M[3] + dZ * M[6]; // convert d to linear RGB
        dG = dX * M[1] + dY * M[4] + dZ * M[7];
        dB = dX * M[2] + dY * M[5] + dZ * M[8];
        z.R = z.X * M[0] + z.Y * M[3] + z.Z * M[6]; // convert z to linear RGB
        z.G = z.X * M[1] + z.Y * M[4] + z.Z * M[7];
        z.B = z.X * M[2] + z.Y * M[5] + z.Z * M[8];
        _r = ((z.R < 0 ? 0 : 1) - z.R) / dR;
        _g = ((z.G < 0 ? 0 : 1) - z.G) / dG;
        _b = ((z.B < 0 ? 0 : 1) - z.B) / dB;
        _r = (_r > 1 || _r < 0) ? 0 : _r;
        _g = (_g > 1 || _g < 0) ? 0 : _g;
        _b = (_b > 1 || _b < 0) ? 0 : _b;
        adjust = _r > _g ? _r : _g;

        if (_b > adjust) {
            adjust = _b;
        }
        // shift proportionally...
        z.R += adjust * dR;
        z.G += adjust * dG;
        z.B += adjust * dB;
        // apply gamma and clamp simulated color...
        z.R = 255 * (z.R <= 0 ? 0 : z.R >= 1 ? 1 : Math.pow(z.R, 1 / gammaCorrection));
        z.G = 255 * (z.G <= 0 ? 0 : z.G >= 1 ? 1 : Math.pow(z.G, 1 / gammaCorrection));
        z.B = 255 * (z.B <= 0 ? 0 : z.B >= 1 ? 1 : Math.pow(z.B, 1 / gammaCorrection));

        if (anomalize) {
            v = 1.75;
            n = v + 1;
            z.R = (v * z.R + rgb$$1.R) / n;
            z.G = (v * z.G + rgb$$1.G) / n;
            z.B = (v * z.B + rgb$$1.B) / n;
        }
        return z;
    };

    var colorVisionData = {
        protanomaly: {type: "protan", anomalize: true},
        protanopia: {type: "protan"},
        deuteranomaly: {type: "deutan", anomalize: true},
        deuteranopia: {type: "deutan"}
    };

    var createBlinder = function (key) {
        return function (colorString) {
        var color = d3.rgb(colorString);
        if (!color) { return undefined; }
            var rgb$$1 = new Blind({
                R: color.r,
                G: color.g,
                B: color.b
            }, colorVisionData[key].type, colorVisionData[key].anomalize);
            rgb$$1.R = rgb$$1.R || 0;
            rgb$$1.G = rgb$$1.G || 0;
            rgb$$1.B = rgb$$1.B || 0;

            return d3.rgb(rgb$$1.R, rgb$$1.G, rgb$$1.B);
        };
    };

    var obj = { cvdTypes: colorVisionData, colorTransforms: {} };
    // add our exported functions
    for (var key in colorVisionData) {
        obj.colorTransforms[key] = createBlinder(key);
    }
    return obj;
};

function getcvdSolution(type) {
    d3.select('.cvdImage').remove();
    d3.selectAll('.cvdText').remove();
    cvdArray = [];
    var newSol = sampleColors(opt.getSolution(), 100);
    for(i=0; i<newSol.length; i++) {
        var color = d3.lab(newSol[i][0], newSol[i][1], newSol[i][2]);
        var cvdColor = color.rgb();
        var transformedColor = type(cvdColor);
        var colorRGB = d3.rgb(transformedColor.r, transformedColor.g, transformedColor.b);
        var transLAB = d3.lab(colorRGB);
        cvdArray.push([transLAB.l, transLAB.a, transLAB.b]);
    }

    // draw colormap

    // get colormap image
    var colormapImage = d3.select("#colormapImage");

    var cvdImage = d3.select("#cvdSimulationImage");
    if (cvdImage.size() == 0) {
        cvdImage = scaffold.getImagePlaceholder()
            .append("image")
                .attr('class', 'cvdImage')
                .attr('x', +colormapImage.attr('x'))
                .attr('y', +colormapImage.attr('y') + 10 + +colormapImage.attr('height'))
                .attr('width', colormapImage.attr('width'))
                .attr('height', colormapImage.attr('height'))
                .attr('id', 'cvdSimulationImage')

        scaffold.getImagePlaceholder().append("text")
            .attr('class', 'smallText cvdText')
            .attr('x', cvdImage.attr('x')+ +cvdImage.attr('width'))
            .attr('y', +cvdImage.attr('y')+ +cvdImage.attr('height')-4)
            .text('CVD simulation')
            .style('fill', 'white')
            .attr('text-anchor', 'end');

            scaffold.getImagePlaceholder().append("text")
                .attr('class', 'smallText cvdText')
                .attr('x', +cvdImage.attr('x')+ +cvdImage.attr('width')-.5)
                .attr('y', +cvdImage.attr('y')+ +cvdImage.attr('height') -4-.5)
                .text('CVD simulation')
                .style('fill', 'black')
                .attr('text-anchor', 'end');

    }
    cvdColormap = colormapFromSolution(cvdArray);
    colormapToImage(cvdColormap, cvdImage);
}
