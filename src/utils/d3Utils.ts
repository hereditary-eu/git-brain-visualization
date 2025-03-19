import { quantize,
         interpolate,
         interpolateRound,
         scaleLinear,
         scaleBand,
         range,
         quantile,
         axisLeft,
         format,
         Selection,
 } from "d3"

function legend(parentG : Selection<SVGSVGElement | SVGGElement, any, any, any>, color : any, {
    title = "",
    tickSize = 6,
    // width = 320, 
    // height = 44 + tickSize,
    // marginTop = 18,
    // marginRight = 0,
    // marginBottom = 16 + tickSize,
    // marginLeft = 0,
    // ticks = width / 64,
    width = 44 + tickSize,
    height = 320, 
    marginTop = 0,
    marginRight = 0,
    marginBottom = 0,
    marginLeft = 20,
    ticks = 5,
    tickFormat,
    tickValues,
    customRamp,
  } : {
    title? : string | undefined,
    tickSize? : number,
    width? : number, 
    height? : number,
    marginTop? : number,
    marginRight? : number,
    marginBottom? : number,
    marginLeft? : number,
    ticks? : number,
    tickFormat? : any,
    tickValues? : any
    customRamp? : (color: any, n? : number) => HTMLCanvasElement
  }) {
  
    function ramp(color : any, n = 256) {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = n;
        const context = canvas.getContext("2d");
        if(context){
          for (let i = 0; i < n; ++i) {
              context.fillStyle = color(i / (n - 1));
              context.fillRect(0, n-i, 1, 1);
          }
        }
        return canvas;
      }
  
    let container = parentG
        .append('g')
  
    let tickAdjust : any = (g : Selection<SVGGElement, any, any, any>) => g.selectAll(".tick line").attr("x1", width - marginRight);
    let x : any;
  
    // Continuous
    if (color.interpolate) {
      const n = Math.min(color.domain().length, color.range().length);
  
      x = color.copy().rangeRound(quantize(interpolate(marginBottom, height - marginTop), n));
  
      container.append("image")
          .attr("x", marginLeft)
          .attr("y", marginTop)
          .attr("width", width - marginLeft - marginRight)
          .attr("height", height - marginTop - marginBottom)
          .attr("preserveAspectRatio", "none")
          .attr("xlink:href", customRamp ? customRamp(color.copy().domain(quantize(interpolate(0, 1), n))).toDataURL() : ramp(color.copy().domain(quantize(interpolate(0, 1), n))).toDataURL());
    }
  
    // Sequential
    else if (color.interpolator) {
      x = Object.assign(color.copy()
          .interpolator(interpolateRound(height - marginTop, marginBottom)),
          {range() { return [height - marginTop, marginBottom ]; }});
  
      container.append("image")
          .attr("x", marginLeft)
          .attr("y", marginTop)
          .attr("width", width - marginLeft - marginRight)
          .attr("height", height - marginTop - marginBottom)
          .attr("preserveAspectRatio", "none")
          .attr("xlink:href", customRamp ? customRamp(color.interpolator()).toDataURL() : ramp(color.interpolator()).toDataURL());
  
      // scaleSequentialQuantile doesn’t implement ticks or tickFormat.
      if (!x.ticks) {
        if (tickValues === undefined) {
          const n = Math.round(ticks + 1);
          tickValues = range(n).map(i => quantile(color.domain(), i / (n - 1)));
        }
        if (typeof tickFormat !== "function") {
          tickFormat = format(tickFormat === undefined ? ",f" : tickFormat);
        }
      }
    }
  
    // Threshold
    else if (color.invertExtent) {
      const thresholds
          = color.thresholds ? color.thresholds() // scaleQuantize
          : color.quantiles ? color.quantiles() // scaleQuantile
          : color.domain(); // scaleThreshold
  
      const thresholdFormat
          = tickFormat === undefined ? (d : any) => d
          : typeof tickFormat === "string" ? format(tickFormat)
          : tickFormat;
  
      x = scaleLinear()
          .domain([-1, color.range().length - 1])
          .rangeRound([marginBottom, height - marginTop]);
  
      container.append("g")
        .selectAll("rect")
        .data(color.range())
        .join("rect")
          .attr("x", (_, i) => x(i - 1))
          .attr("y", marginRight)
          .attr("width", (_, i) => x(i) - x(i - 1))
          .attr("height", width - marginRight - marginLeft)
          .attr("fill", (d : any) => d);
  
      tickValues = range(thresholds.length);
      tickFormat = (i : number) => thresholdFormat(thresholds[i], i);
    }
  
    // Ordinal
    else {
      x = scaleBand()
          .domain(color.domain())
          .rangeRound([marginBottom, height - marginTop]);
  
      container.append("g")
        .selectAll("rect")
        .data(color.domain())
        .join("rect")
          .attr("x", x)
          .attr("y", marginRight)
          .attr("width", Math.max(0, x.bandwidth() - 1))
          .attr("height", width - marginRight - marginLeft)
          .attr("fill", color);
  
      tickAdjust = () => {};
    }
  
    container.append("g")
        .attr("transform", `translate(0,0)`)
        .call(axisLeft(x)
          .ticks(ticks, typeof tickFormat === "string" ? tickFormat : undefined)
          .tickFormat(typeof tickFormat === "function" ? tickFormat : undefined)
          .tickSize(tickSize)
          .tickValues(tickValues))
        .call(tickAdjust)
        .call(g => g.select(".domain").remove())
        .call(g => g.append("text")
          .attr("x", marginLeft + (width - marginLeft - marginRight)/2)
          .attr("y", height + 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "middle")
          .attr("font-weight", "bold")
          .attr("class", "title")
          .text(title));
  }

  export { legend }