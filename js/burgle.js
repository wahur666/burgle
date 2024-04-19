"use strict";

const Burgle = (function () {
    const show_heat = function (show) {
        heatmap = show;
        if (heatmap) {
            document.getElementById("show_heatmap").setAttribute("class", "hidden");
            document.getElementById("hide_heatmap").removeAttribute("class");
        } else {
            document.getElementById("hide_heatmap").setAttribute("class", "hidden");
            document.getElementById("show_heatmap").removeAttribute("class");
        }
        const floors = document.getElementsByClassName("floor");
        for (let f = 0; f < floors.length; f++) {
            const layout = floors[f].getAttribute("layout");
            if (layout !== null) {
                const floor = to_floor(parseWalls(layout));
                generate_heatmap(floors[f].getAttribute("id"), floor);
            }
        }
        update_href();
    };
    const update_job = function () {
        const j = document.getElementById("job");
        const info = j.options[j.selectedIndex].value.split(":");
        floors = parseInt(info[0]);
        size = parseInt(info[1]);
        walls = parseInt(info[2]);
        shaft = -1;
        size_sq = size * size;
        update_dom();
    };
    const get_walls = function (tile) {
        const dec = size - 1;
        const max = 2 * size * dec;
        const off = tile % size;
        const row = Math.floor(tile / size) * (size + dec);
        const ind = row + off;
        const val = [];
        if (off > 0) val.push(ind - 1);
        if (off < dec) val.push(ind);
        if (ind >= size + dec) val.push(ind - size);
        if (ind + dec < max) val.push(ind + dec);
        return val;
    };
    const generate = function (id) {
        let f;
        let floors;
        const max = 2 * size * (size - 1);
        const permanent_walls = [];
        let shaft_walls = [];
        if (id === undefined || id === "all") {
            floors = document.getElementsByClassName("floor");
            if (size === 5) {
                if (shaft > -1) {
                    for (f = 0; f < floors.length; f++) {
                        const id = floors[f].getAttribute("id");
                        document.getElementById(id + "_t" + shaft).className = "tile";
                    }
                }
                shaft = Math.floor(Math.random() * size_sq);
            }
        } else {
            floors = [document.getElementById(id)];
        }
        if (shaft > -1) {
            shaft_walls = get_walls(shaft);
            shaft_walls.forEach(function (w) {
                permanent_walls[w] = true;
            });
        }
        for (f = 0; f < floors.length; f++) {
            const id = floors[f].getAttribute("id");
            while (true) {
                const wall = permanent_walls.slice();
                for (let w = 0; w < walls;) {
                    const n = Math.floor(Math.random() * max);
                    if (!wall[n]) {
                        w++;
                        wall[n] = true;
                    }
                }
                shaft_walls.forEach(function (w) {
                    wall[w] = false;
                });
                if (set_layout(id, wall)) {
                    break;
                }
            }
        }
        update_href();
    };
    let heatmap = false;
    let floors = 3;
    let size = 4;
    let walls = 8;
    let shaft = -1;
    let size_sq = size * size;
    let default_jobs = [
        ["703h1", "e0607", "81ll0"],
        ["190m3", "11hu0"],
        ["2934c5k0", "611cc425"]
    ];

    const getParameterByName = function (name) {
        name = name.replace(/\[/, "\\[").replace(/]/, "\\]");
        const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
        const results = regex.exec(location.search);
        return results === null
            ? ""
            : decodeURIComponent(results[1].replace(/\+/g, " "));
    };

    const wallsToString = function (walls) {
        let val = 0;
        let j = (walls.length - 1) % 5;
        let str = "";
        for (let i = walls.length - 1; i >= 0; i--) {
            if (walls[i]) {
                val |= 1 << j;
            }
            j--;
            if (j < 0) {
                str += val.toString(32);
                val = 0;
                j = 4;
            }
        }
        return str;
    };

    const parseWalls = function (str) {
        let walls = [];
        let i = str.length;
        let c;
        let j;
        while (i--) {
            c = parseInt(str[i], 32);
            for (j = 0; j < 5; j++) {
                walls.push(!!(c & (1 << j)));
            }
        }
        return walls;
    };

    const to_floor = function (walls) {
        let i = 0;
        let x = 0;
        const floor = new Array(size_sq + 1)
            .join(1)
            .split("")
            .map(function () {
                return {heat: 0};
            });
        for (let y = 0; y < size; y++) {
            for (x = 0; x < size - 1; x++) {
                if (!walls[i]) {
                    floor[y * size + x].e = true;
                    floor[y * size + x + 1].w = true;
                }
                i++;
            }
            if (y < size - 1) {
                for (x = 0; x < size; x++) {
                    if (!walls[i]) {
                        floor[y * size + x].s = true;
                        floor[(y + 1) * size + x].n = true;
                    }
                    i++;
                }
            }
        }
        return floor;
    };

    const valid = function (floor) {
        const check = [shaft === 0 ? 1 : 0];
        let visited = 0;
        if (shaft > -1) {
            floor[shaft].v = true;
            visited++;
        }
        while (check.length > 0) {
            const next = check.pop();
            const tile = floor[next];
            if (tile.v) continue;
            visited++;
            tile.v = true;
            if (tile.n) check.push(next - size);
            if (tile.e) check.push(next + 1);
            if (tile.s) check.push(next + size);
            if (tile.w) check.push(next - 1);
        }
        return visited === size_sq;
    };

    const update_distance = function (a_ind, b_ind, dist) {
        if (a_ind === shaft || b_ind === shaft) return;

        let a = a_ind * size_sq;
        let b = b_ind * size_sq;
        for (let i = 0; i < size_sq; i++) {
            if (dist[a] < dist[b]) dist[b] = dist[a] + 1;
            else if (dist[b] < dist[a]) dist[a] = dist[b] + 1;
            a++;
            b++;
        }
    };

    const build_distance = function (floor) {
        let i;
        const dist = new Array(size_sq * size_sq + 1)
            .join(1)
            .split("")
            .map(function () {
                return 50;
            });
        for (i = 0; i < size_sq; i++) dist[i * size_sq + i] = 0;
        for (let r = 0; r < size_sq; r++) {
            for (i = 0; i < size_sq; i++) {
                if (floor[i].n) update_distance(i, i - size, dist);
                if (floor[i].e) update_distance(i, i + 1, dist);
                if (floor[i].s) update_distance(i, i + size, dist);
                if (floor[i].w) update_distance(i, i - 1, dist);
            }
        }
        return dist;
    };

    //from: index of tile
    //to: index of tile
    //options: array of [radians, neighbor's index]
    const find_clockwise = function (from, to, options) {
        const dy = Math.floor(to / size) - Math.floor(from / size);
        const dx = (to % size) - (from % size);
        const target = Math.atan2(dy, dx);
        let max = 0;
        let dir;
        for (let i = 0; i < options.length; i++) {
            const o = options[i];
            let r = o[0] - target;
            if (r < 0) r += 2 * Math.PI;
            if (r > max) {
                max = r;
                dir = o[1];
            }
        }
        return dir;
    };

    const walk = function (from, to, floor, dist) {
        if (from === shaft || to === shaft) return;

        let min;
        let shortest = [];
        let tile;

        function look(dir, neighbor, r) {
            const ind = neighbor * size_sq + to;
            if (tile[dir]) {
                if (dist[ind] < min) {
                    shortest = [[r, neighbor]];
                    min = dist[ind];
                } else if (dist[ind] === min) {
                    shortest.push([r, neighbor]);
                }
            }
        }

        while (from !== to) {
            min = 50;
            tile = floor[from];
            look("n", from - size, Math.PI * -0.5);
            look("e", from + 1, 0);
            look("s", from + size, Math.PI * 0.5);
            look("w", from - 1, Math.PI);
            const next =
                shortest.length > 1
                    ? find_clockwise(from, to, shortest)
                    : shortest[0][1];
            floor[next].heat++;
            from = next;
        }
    };

    const generate_heatmap = function (id, floor) {
        let i;
        let j;
        let heat = [];
        if (!heatmap) {
            for (i = 0; i < size_sq; i++) {
                document.getElementById(id + "_t" + i).style.backgroundColor = "";
            }
            return;
        }

        const dist = build_distance(floor);
        for (i = 0; i < size_sq; i++) {
            for (j = 0; j < size_sq; j++) {
                walk(i, j, floor, dist);
            }
        }
        for (i = 0; i < size_sq; i++) {
            if (i !== shaft) {
                heat = (1.0 - (floor[i].heat - (size_sq - 1)) / 168) * 240;
                document.getElementById(id + "_t" + i).style.backgroundColor =
                    "hsl(" + heat + ",100%,50%)";
            }
        }
        if (shaft > -1) {
            //When regenerating a level and changing the location of the shaft, if there was a heatmap, a backgroundColor will exist for the new location
            document.getElementById(id + "_t" + shaft).style.backgroundColor = "";
        }
        heat = [];
        for (let y = 0; y < size; y++) {
            const r = [];
            for (let x = 0; x < size; x++) {
                r.push(floor[y * size + x].heat);
            }
            heat.push(r);
        }
        let total_heat = 0;
        for (i = 0; i < size_sq; i++) {
            total_heat += floor[i].heat;
        }
    };

    const set_layout = function (id, walls) {
        const floor = to_floor(walls);
        if (!valid(floor)) return false;
        const f = document.getElementById(id);
        f.setAttribute("layout", wallsToString(walls));
        if (shaft > -1) {
            document.getElementById(id + "_t" + shaft).className = "shaft";
        }
        for (let w = 0; w < size * (size - 1) * 2; w++) {
            document.getElementById(id + "_" + w).className = walls[w] ? "wall" : "";
        }
        generate_heatmap(id, floor);
        return true;
    };

    const init = function () {
        const j = getParameterByName("job");
        if (j !== "") document.getElementById("job").options[j].selected = true;
        update_job();
        const s = getParameterByName("s");
        if (s !== "") shaft = parseInt(s, 36);
        if (getParameterByName("heat") !== "") {
            heatmap = true;
            const heat = document.getElementById("burgle_heat");
            if (heat !== null) heat.checked = heatmap;
        }
        let haveFloorsInUrl = false;
        const floors = document.getElementsByClassName("floor");
        for (let f = 0; f < floors.length; f++) {
            const layout = getParameterByName(floors[f].getAttribute("id"));
            if (layout) {
                set_layout(floors[f].getAttribute("id"), parseWalls(layout));
                haveFloorsInUrl = true;
            }
        }
        if (!haveFloorsInUrl) generate();
        else show_heat(heatmap);
    };

    const update_dom = function () {
        const floorElem = document.getElementById("floors");
        while (floorElem.lastChild) {
            floorElem.removeChild(floorElem.lastChild);
        }

        const cols = size * 2 - 1;
        for (let f = 0; f < floors; f++) {
            const id = "f" + f;
            const container = document.createElement("div");
            container.setAttribute("class", "floorContainer");

            const floor = document.createElement("div");
            floor.setAttribute("class", (size === 5 ? "knox" : "bank") + " floor");
            floor.setAttribute("id", id);
            const table = document.createElement("table");
            let wall = 0;
            for (let i = 0; i < cols; i++) {
                const row = document.createElement("tr");
                for (let j = 0; j < cols; j++) {
                    const td = document.createElement("td");
                    if (i % 2 === 0 && j % 2 === 0) {
                        td.className = "tile";
                        td.setAttribute("id", id + "_t" + ((i / 2) * size + j / 2));
                    }
                    if (i % 2 === 0 ? j % 2 !== 0 : j % 2 === 0)
                        td.setAttribute("id", id + "_" + wall++);
                    row.appendChild(td);
                }
                table.appendChild(row);
            }
            floor.appendChild(table);

            const btn = document.createElement("button");
            btn.setAttribute("class", "center");
            btn.setAttribute("onClick", "Burgle.generate('f" + f + "')");
            btn.appendChild(
                document.createTextNode("Generate " + (f + 1) + ". Floor")
            );

            container.appendChild(floor);
            container.appendChild(btn);
            floorElem.appendChild(container);
        }
    };

    const update_href = function () {
        let link = window.location.protocol + "//";
        link += window.location.hostname;
        if (window.location.port) link += ":" + window.location.port;
        link += window.location.pathname + "?job=";
        link += document.getElementById("job").selectedIndex;
        if (heatmap) link += "&heat=on";
        if (shaft > -1) link += "&s=" + shaft.toString(36);
        const floors = document.getElementsByClassName("floor");
        for (let f = 0; f < floors.length; f++) {
            link +=
                "&" +
                floors[f].getAttribute("id") +
                "=" +
                floors[f].getAttribute("layout");
        }
        document.getElementById("burgle_href").href = link;
    };


    const set_dims = function (opt) {
        size = opt.size;
        shaft = opt.shaft;
        size_sq = size * size;
    };

    const new_job = function () {
        update_job();
        generate();
    };

    const default_job = function () {
        update_job();
        const job = document.getElementById("job").selectedIndex;
        shaft = job === 2 ? 12 : -1;
        const floors = document.getElementsByClassName("floor");
        for (let f = 0; f < floors.length; f++) {
            const layout = default_jobs[job][f];
            set_layout(floors[f].getAttribute("id"), parseWalls(layout));
        }
        show_heat(heatmap);
    };


    return {
        find_clockwise: find_clockwise,
        generate: generate,
        get_walls: get_walls,
        init: init,
        new_job: new_job,
        default_job: default_job,
        parseWalls: parseWalls,
        show_heat: show_heat,
        to_floor: to_floor,
        valid: valid,
        wallsToString: wallsToString,
        _set: set_dims
    };
})();

