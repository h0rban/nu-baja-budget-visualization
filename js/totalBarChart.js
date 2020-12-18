function totalBarChart() {

    // Based on Mike Bostock's margin convention https://bl.ocks.org/mbostock/3019563
    let margin = {top: 60, left: 50, right: 30, bottom: 50},
        width = 700 - margin.left - margin.right,
        height = 300 - margin.top - margin.bottom,
        barHeight = height - margin.top - margin.bottom,
        barWidth = width - margin.left - margin.right,

        // labels
        left_label = "E",
        right_label = "F",
        title = 'Total Remaining Budget',

        // transition speed
        transitionBuild = 1000,
        transitionInProgress = 500,

        // null or empty variables
        barS = null,
        barR = null,
        dispatcher = null,
        originalData = null,
        all_sources = new Set(),
        selectedSources = new Set(),

        // x scale function
        xScale = d3.scaleLinear().domain([0, 100]).range([0, width]),

        // function returns the sum of percents of selected sources
        percent_selected = function (data) {
            let percent = d3.scaleLinear()
                .domain([0, d3.sum(data, d => d.total_amount)])
                .range([0, 100])
            return d3.sum(data
                .filter(d => selectedSources.has(d.source))
                .map(d => percent(d.total_amount - d.amount_spent)));
        },

        // function returns the width of the selected rectangle
        get_width = data => Math.ceil(xScale(percent_selected(data))),

        // Updates the selected sources and calls dispatcher
        updateSelection = function () {
            selectedSources = all_sources;
            barS.transition().duration(transitionInProgress).attr('width', get_width(originalData))
            // Get the name of our dispatcher's event, Let other charts know
            dispatcher.call(Object.getOwnPropertyNames(dispatcher._)[0], this, selectedSources);
        };

    // Create the chart by adding an svg to the div with the id specified by the selector using the given data
    function chart(selector, data, sources) {

        // save data to global constant, set selected sources to include all sources
        originalData = data;
        all_sources = new Set(sources);
        selectedSources = new Set(sources);

        // define variables
        let total = d3.sum(data, d => d.total_amount),
            remaining = total - d3.sum(data, d => d.amount_spent),

            // define view box and svg object
            svg = d3.select(selector)
                .append('svg')
                .attr('viewBox', [0, 0, width + margin.left + margin.right, height].join(' ')),

            // create custom dispatch events
            dispatch = d3.dispatch("mouseover", "mouseout");

        // add labels
        svg.append("text")
            .classed('chart-title', true)
            .attr("x", width / 2)
            .attr("y", margin.top / 2)
            .text(title);

        svg.append("text")
            .classed('chart-title', true)
            .attr('x', margin.left - 20)
            .attr('y', margin.top + barHeight / 2 + 25 / 2)
            .attr('font-size', '25')
            .text(left_label);

        svg.append("text")
            .classed('chart-title', true)
            .attr('x', width - margin.right + 15)
            .attr('y', margin.top + barHeight / 2 + 25 / 2)
            .attr('font-size', '25')
            .text(right_label);

        let tooltip = d3.select(selector)
            .append("div")
            .classed('tooltip', true);

        // add the remaining bar, save to variable
        barR = svg.append('rect')
            .classed("bar", true)
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', 0)
            .attr('height', barHeight);

        // add the selected rectangle, save to variable
        barS = svg.append('rect')
            .classed("bar", true)
            .classed("selected", true)
            .attr('x', margin.left)
            .attr('y', margin.top)
            .attr('width', 0)
            .attr('height', barHeight);

        // add outline rectangle
        svg.append('rect')
            .classed('outline', true)
            .attr('x', margin.left - 1)
            .attr('y', margin.top - 1)
            .attr('width', barWidth + 2)
            .attr('height', barHeight + 2)
            .on('click', () => updateSelection()) // todo update selection
            .on("mouseout", () => {
                dispatch.call('mouseout')
                tooltip.style("visibility", "hidden");
            })
            .on("mouseover", () => {
                dispatch.call('mouseover');
                tooltip.style("visibility", "visible");
            })
            // function that change the tooltip when user hover / move / leave a cell
            .on("mousemove", (event) => tooltip
                .html(""
                    + "Budget Total: $"
                    + total
                    + "<br>Amount Remaining: $"
                    + Math.round((total - remaining) * 100 / 100))
                .style("left", (event.pageX) + "px")
                .style("top", (event.pageY - 150) + "px")
            );

        // add scale
        svg.append("g")
            .attr('transform', `translate(${margin.left},${margin.top + barHeight + 1})`)
            .call(d3.axisBottom(d3.scaleOrdinal().domain(["0", "1/4", "1/2", "3/4", "1"])
                .range([0, barWidth / 4, barWidth / 2, barWidth * 3 / 4, barWidth])));

        // add transitions
        barS.transition().duration(transitionBuild).attr('width', get_width(data));
        barR.transition().duration(transitionBuild).attr('width', get_width(data));

        // when mouseover is called, updates the class of the remaining bar
        dispatch.on('mouseover', () => {
            barR.classed('mouseover', true);
        });

        dispatch.on('mouseout', () => {
            barR.classed('mouseover', false);
        });

        return chart;
    }

    // Given selected data from another visualization select the relevant elements here (linking)
    chart.updateSelection = function (selectedData) {
        if (!arguments.length) {
            return;
        }
        selectedSources = selectedData;
        barS.transition().duration(transitionInProgress).attr('width', get_width(originalData));
    };

    // Gets or sets the dispatcher we use for selection events
    chart.selectionDispatcher = function (_) {
        if (!arguments.length) {
            return dispatcher;
        }
        dispatcher = _;
        return chart;
    };

    return chart;
}
