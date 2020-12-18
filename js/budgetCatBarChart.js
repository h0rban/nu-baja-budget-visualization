function budgetCatBarChart() {

    // Based on Mike Bostock's margin convention https://bl.ocks.org/mbostock/3019563
    let margin = {top: 60, left: 50, right: 30, bottom: 50},
        width = 700 - margin.left - margin.right,
        height = 350 - margin.top - margin.bottom,

        // labels
        title = 'Percent of Total Spent by Budget Category (%)',
        xLabelText = 'Budget Category',
        yLabelText = 'Percent Spent',

        // transition speed
        transitionBuild = 1000,
        transitionInProgress = 500,

        // null or empty variables
        bars = null,
        categories = null,
        original_data = null,
        selectedSources = new Set(),
        outline = null,

        // y scale
        yScale = d3.scaleLinear().domain([0, 100]).range([height - margin.bottom, margin.top]),

        // returns a data object used for the visualizations
        get_selected_data = () => {
            let filtered = original_data
                    .filter(d => d.amount_spent !== 0 && selectedSources.has(d.source)),
                total = d3.sum(filtered
                    .filter(d => d.amount_spent > 0)
                    .map(d => d.amount_spent));
            if (total === 0) {
                return categories.map(c => {
                    return {category: c, percent: 0};
                });
            }
            return categories.map(c => {
                let fraction = 0,
                    to_sum = filtered
                        .filter(d => c === d.category && d.amount_spent > 0)
                        .map(d => d.amount_spent);
                if (to_sum.length > 0) {
                    fraction = d3.sum(to_sum);
                }
                return {category: c, percent: fraction / total * 100};
            });
        };


    // Create the chart by adding an svg to the div with the id specified by the selector using the given data
    function chart(selector, data, sources) {

        // set global variable
        original_data = data
        selectedSources = new Set(sources)
        categories = Array.from(new Set(data.map(d => d.category)))
        data = get_selected_data()

        // x scale
        let xScale = d3.scaleBand()
                .domain(categories)
                .range([margin.left, width - margin.right])
                .padding(0.5),

            // define svg
            svg = d3.select(selector)
                .append('svg')
                .attr('viewBox', [0, 0, width + margin.left + margin.right, height + margin.bottom].join(' '));

        // append title
        svg.append("text")
            .classed('chart-title', true)
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .text(title);

        // append x axis
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom().scale(xScale));

        // append x axis title
        svg.append('text')
            .classed('axes-label', true)
            .attr('x', width / 2)
            .attr('y', height + 10)
            .text(xLabelText);

        // append y axis
        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft().scale(yScale));

        // append y axis label
        svg.append('text')
            .classed('axes-label', true)
            .attr('x', -(height + margin.bottom) / 2)
            .attr('y', margin.left / 4)
            .attr("transform", "rotate(-90)")
            .text(yLabelText);

        // define tooltips
        let tooltip = d3.select(selector)
            .append("div")
            .classed('tooltip', true);

        // append filled bars and save them in a variable
        bars = svg.selectAll(selector)
            .data(data).enter()
            .append('rect')
            .classed('bar', true)
            .classed('selected', true)
            .attr('x', d => xScale(d.category))
            .attr('y', height - margin.bottom)
            .attr('width', xScale.bandwidth())
            .attr('height', 0);

        // append outline rectangles
        outline = svg.selectAll(selector)
            .data(data).enter()
            .append('rect')
            .classed('outline', true)
            .attr('x', d => xScale(d.category) - 1)
            .attr('y', margin.top - 1)
            .attr('width', xScale.bandwidth() + 2)
            .attr('height', height - margin.top - margin.bottom + 2)
            .on("mouseout", () => tooltip.style("visibility", "hidden"))
            .on("mouseover", () => tooltip.style("visibility", "visible"))
            // function that change the tooltip when user hover / move / leave a cell
            .on("mousemove", (event, d) => tooltip
                .html(""
                    + "<b>Budget Category: "
                    + d.category
                    + "</b><br>Proportion of Total Amount Spent: "
                    + Math.round((d.percent) * 100) / 100
                    + "%")
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 150) + "px"));

        // transitions
        bars.transition()
            .duration(transitionBuild)
            .attr('y', d => Math.ceil(yScale(d.percent)))
            .attr('height', d => height - margin.bottom - Math.floor(yScale(d.percent)));

        return chart;
    }

    // Given selected data from another visualization select the relevant elements here (linking)
    chart.updateSelection = function (sources) {
        if (!arguments.length) return;
        selectedSources = sources
        let selected_data = get_selected_data()
        outline.data(selected_data).enter()
        bars.data(selected_data)
            .transition()
            .duration(transitionInProgress)
            .attr('y', d => Math.ceil(yScale(d.percent)))
            .attr('height', d => height - margin.bottom - Math.floor(yScale(d.percent)))
    };

    return chart;
}
