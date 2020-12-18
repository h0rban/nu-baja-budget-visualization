function sourceBarChart() {

    // Based on Mike Bostock's margin convention https://bl.ocks.org/mbostock/3019563
    let margin = {top: 60, left: 50, right: 30, bottom: 50},
        width = 700 - margin.left - margin.right,
        height = 350 - margin.top - margin.bottom,

        // labels
        title = 'Percent Remaining by Funding Source (%)',
        xLabelText = 'Funding Source',
        yLabelText = 'Percent Remaining',

        // transition speed
        transitionBuild = 1000,

        // null or empty variables
        bars = null,
        tooltip = null,
        tooltip_initial = null,
        dispatcher = null,
        all_sources = new Set(),
        selectedSources = new Set(),

        first_click = true

    // percent spent
    percent_spent = d => d.amount_spent / d.total_amount * 100,

        // percent remaining
        percent_remaining = d => 100 - percent_spent(d),

        // function that returns whether selected sources contains the given string
        isSelected = d => selectedSources.has(d),

        // Updates the selected sources and calls dispatcher
        updateSelection = function (event, d) {
            if (d == null || !d.hasOwnProperty('source')) {
                selectedSources = new Set(all_sources);
            } else if (event.shiftKey) {
                if (selectedSources.size === all_sources.size) {
                    selectedSources = new Set([d.source]);
                } else if (selectedSources.size > 1 && selectedSources.has(d.source)) {
                    selectedSources.delete(d.source);
                } else {
                    selectedSources.add(d.source);
                }
            } else {
                selectedSources = new Set([d.source]);
            }
            // Get the name of our dispatcher's event, Let other charts know
            dispatcher.call(Object.getOwnPropertyNames(dispatcher._)[0], this, selectedSources);
            bars.classed("selected", d => isSelected(d.source));
        };

    // Create the chart by adding an svg to the div with the id specified by the selector using the given data
    function chart(selector, data, sources, sort) {

        // set global variables
        all_sources = new Set(sources);
        selectedSources = new Set(sources);

        // sort data in descending order of the percent remaining
        if (sort) {
            data.sort((a, b) => d3.descending(percent_remaining(a), percent_remaining(b)));
        }

        // x scale
        let xScale = d3.scaleBand()
                .domain(data.map(d => d.source))
                .range([margin.left, width - margin.right])
                .padding(0.5),

            // y scale
            yScale = d3.scaleLinear()
                .domain([0, 100])
                .range([height - margin.bottom, margin.top]),

            // define svg
            svg = d3.select(selector)
                .append('svg')
                .attr('viewBox', [0, 0, width + margin.left + margin.right,
                    height + margin.bottom].join(' ')),

            // define a set to keep track of the mouseover bar
            overSet = new Set(),

            // create custom dispatch events
            dispatch = d3.dispatch("mouseover");

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
            .attr('y', margin.left / 4)
            .attr('x', -(height + margin.bottom - 10) / 2)
            .attr("transform", "rotate(-90)")
            .text(yLabelText);

        // append empty rectangle to remove selection
        svg.append('rect')
            .attr('width', width)
            .attr('height', height)
            .on('click', () => updateSelection(null, null));

        // define tooltips
        tooltip = d3.select(selector)
            .append("div")
            .classed('tooltip', true);

        tooltip_initial = d3.select(selector)
            .append("div")
            .classed('tooltip', true);

        // append and save filled bars, save variable
        bars = svg.selectAll(selector)
            .data(data).enter()
            .append('rect')
            .classed('bar', true)
            .classed('selected', true)
            .attr('x', d => xScale(d.source))
            .attr('y', height - margin.bottom)
            .attr('width', xScale.bandwidth())
            .attr('height', 0);

        // Append outline rectangles
        svg.selectAll(selector)
            .data(data).enter()
            .append('rect')
            .classed('outline', true)
            .attr('x', d => xScale(d.source) - 1)
            .attr('y', margin.top - 1)
            .attr('width', xScale.bandwidth() + 2)
            .attr('height', height - margin.top - margin.bottom + 2)
            .on('click', (event, d) => {
                updateSelection(event, d)
                tooltip_initial.style("visibility", "hidden")
                first_click = false
            })
            .on("mouseout", () => {
                overSet = new Set();
                dispatch.call('mouseover');
                tooltip.style("visibility", "hidden");
            })
            .on("mouseover", (event, d) => {
                overSet = new Set([d.source]);
                dispatch.call('mouseover');
                if (!first_click) {
                    if (!event.shiftKey) {
                        return tooltip.style("visibility", "visible");
                    }
                    return tooltip.style("visibility", "hidden");
                }
            })
            // function that change the tooltip when user hover / move / leave a cell
            .on("mousemove", (event, d) => {
                if (!first_click) {
                    if (!event.shiftKey) {
                        tooltip
                            .html(""
                                + "<p><b>Funding Source: "
                                + d.source
                                + "</b><br>Amount Spent: $"
                                + d.amount_spent
                                + "<br>Amount Remaining: $"
                                + Math.round((d.total_amount - d.amount_spent) * 100) / 100)
                            .style("left", (event.pageX) + "px")
                            .style("top", (event.pageY - 150) + "px");
                    } else {
                        tooltip.style("visibility", "hidden");
                    }
                }
            });

        // when mouseover is called, updates the class of the bars
        dispatch.on('mouseover', () => {
            bars.classed('mouseover', d => overSet.has(d.source));
        });

        // transitions
        bars.transition()
            .duration(transitionBuild)
            .attr('y', d => height + 10 - Math.ceil(yScale(percent_spent(d))))
            .attr('height', d => height - margin.bottom - Math.floor(yScale(percent_remaining(d))));

        tooltip_initial.html("<p> Click a bar</p>")
            .style("left", (window.innerWidth / 2) + "px")
            .style("top", (1100) + "px")
            .style("visibility", "visible")

        return chart;
    }

    // Gets or sets the dispatcher we use for selection events
    chart.selectionDispatcher = function (_) {
        if (!arguments.length) {
            return dispatcher;
        }
        dispatcher = _;
        return chart;
    };

    // Given selected data from another visualization select the relevant elements here (linking)
    chart.updateSelection = function (selectedData) {
        selectedSources = selectedData;
        bars.classed("selected", d => isSelected(d.source));
    };

    return chart;
}
