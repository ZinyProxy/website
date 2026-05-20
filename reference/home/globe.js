// // // Ensure the script runs after the DOM is ready.
// document.addEventListener('DOMContentLoaded', () => {
//     const container = d3.select("#globe-container");
//     if (container.empty()) {
//         return;
//     }
//     const width = container.node().getBoundingClientRect().width;
//     const height = 500;

//     const config = {
//         speed: 0.008,
//         verticalTilt: -10,
//         horizontalTilt: 0
//     };

//     const svg = container.append("svg")
//         .attr("width", width)
//         .attr("height", height);

//     const projection = d3.geoOrthographic()
//         .scale(Math.min(width, height) / 2 - 20)
//         .translate([width / 2, height / 2])
//         .clipAngle(90);

//     const path = d3.geoPath().projection(projection);
//     const center = [width / 2, height / 2];

//     Promise.all([
//         d3.json(sgd_plugin_data.world_data_url),
//         d3.json(sgd_plugin_data.marker_data_url)
//     ]).then(([worldData, markerData]) => {
//         const land = topojson.feature(worldData, worldData.objects.countries);

//         svg.append("path")
//             .datum({ type: "Sphere" })
//             .attr("class", "sphere")
//             .attr("d", path)
//             .style("fill", "#b3cde3");

//         svg.append("path")
//             .datum(d3.geoGraticule())
//             .attr("class", "graticule")
//             .attr("d", path);

//         svg.append("path")
//             .datum(land)
//             .attr("class", "land")
//             .attr("d", path);

//         const markerGroup = svg.append("g").attr("class", "marker-group");

//         function drawMarkers() {
//             const markers = markerGroup.selectAll("g.marker")
//                 .data(markerData);


//             const enter = markers.enter()
//                 .append("g")
//                 .attr("class", "marker");

//             const baseSize = 30;

//             enter.append("image")
//                 .attr("href", sgd_plugin_data.markerImage)
//                 .attr("width", d => baseSize * (projection.scale() / 300))
//                 .attr("height", d => baseSize * (projection.scale() / 300))
//                 .attr("x", d => -(baseSize * (projection.scale() / 300)) / 2)
//                 .attr("y", d => -(baseSize * (projection.scale() / 300)));

//             markers.merge(enter)
//                 .attr("transform", d => {
//                     const pos = projection([d.longitude, d.latitude]);
//                     if (!pos) return "translate(-9999,-9999)";
//                     const gdistance = d3.geoDistance([d.longitude, d.latitude], projection.invert(center));
//                     return gdistance > 1.57
//                         ? "translate(-9999,-9999)"
//                         : `translate(${pos[0]},${pos[1]})`;
//                 });
//         }
//         d3.timer((elapsed) => {
//             const rotation = [config.speed * elapsed - 120, config.verticalTilt, config.horizontalTilt];
//             projection.rotate(rotation);
//             svg.selectAll("path").attr("d", path);
//             drawMarkers();
//         });
//     });
// });

document.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll(".globe-container");
    if (!containers.length) return;

    containers.forEach(containerEl => {
        const container = d3.select(containerEl);
        const width = container.node().getBoundingClientRect().width;
        const height = 500;

        const config = {
            speed: 0.008,
            verticalTilt: -10,
            horizontalTilt: 0
        };

        const svg = container.append("svg")
            .attr("width", width)
            .attr("height", height);

        const projection = d3.geoOrthographic()
            .scale(Math.min(width, height) / 2 - 20)
            .translate([width / 2, height / 2])
            .clipAngle(90);

        const path = d3.geoPath().projection(projection);
        const center = [width / 2, height / 2];

        Promise.all([
            d3.json(sgd_plugin_data.world_data_url),
            d3.json(sgd_plugin_data.marker_data_url)
        ]).then(([worldData, markerData]) => {
            const land = topojson.feature(worldData, worldData.objects.countries);

            svg.append("path")
                .datum({ type: "Sphere" })
                .attr("class", "sphere")
                .attr("d", path)
                .style("fill", "#b3cde3");

            svg.append("path")
                .datum(d3.geoGraticule())
                .attr("class", "graticule")
                .attr("d", path);

            svg.append("path")
                .datum(land)
                .attr("class", "land")
                .attr("d", path);

            const markerGroup = svg.append("g").attr("class", "marker-group");

            function drawMarkers() {
                const markers = markerGroup.selectAll("g.marker")
                    .data(markerData);

                const enter = markers.enter()
                    .append("g")
                    .attr("class", "marker");

                const baseSize = 30;

                enter.append("image")
                    .attr("href", sgd_plugin_data.markerImage)
                    .attr("width", d => baseSize * (projection.scale() / 300))
                    .attr("height", d => baseSize * (projection.scale() / 300))
                    .attr("x", d => -(baseSize * (projection.scale() / 300)) / 2)
                    .attr("y", d => -(baseSize * (projection.scale() / 300)));

                markers.merge(enter)
                    .attr("transform", d => {
                        const pos = projection([d.longitude, d.latitude]);
                        if (!pos) return "translate(-9999,-9999)";
                        const gdistance = d3.geoDistance([d.longitude, d.latitude], projection.invert(center));
                        return gdistance > 1.57
                            ? "translate(-9999,-9999)"
                            : `translate(${pos[0]},${pos[1]})`;
                    });
            }

            d3.timer((elapsed) => {
                const rotation = [config.speed * elapsed - 120, config.verticalTilt, config.horizontalTilt];
                projection.rotate(rotation);
                svg.selectAll("path").attr("d", path);
                drawMarkers();
            });
        });
    });
});
