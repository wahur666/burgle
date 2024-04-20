"use strict";

class BurgleC {

    heatmap = false;
    floors = 3;
    size = 4;
    walls = 8;
    shaft = -1;
    size_sq = this.size * this.size;
    default_jobs = [
        ["703h1", "e0607", "81ll0"],
        ["190m3", "11hu0"],
        ["2934c5k0", "611cc425"]
    ]

    getParameterByName(name: string) {
        name = name.replace(/\[/, "\\[").replace(/]/, "\\]");
        const regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
        const results = regex.exec(location.search);
        return results === null
            ? ""
            : decodeURIComponent(results[1].replace(/\+/g, " "));
    }

    wallsToString(walls) {
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
    }

    parseWalls(str) {
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
    }

    to_floor(walls) {
        let i = 0;
        let x = 0;
        const floor = new Array(this.size_sq + 1)
            .join("1")
            .split("")
            .map(function () {
                return {
                    heat: 0,
                    e: false,
                    n: false,
                    s: false,
                    w: false
                };
            });
        for (let y = 0; y < this.size; y++) {
            for (x = 0; x < this.size - 1; x++) {
                if (!walls[i]) {
                    floor[y * this.size + x].e = true;
                    floor[y * this.size + x + 1].w = true;
                }
                i++;
            }
            if (y < this.size - 1) {
                for (x = 0; x < this.size; x++) {
                    if (!walls[i]) {
                        floor[y * this.size + x].s = true;
                        floor[(y + 1) * this.size + x].n = true;
                    }
                    i++;
                }
            }
        }
        return floor;
    }

    valid(floor) {
        const check = [this.shaft === 0 ? 1 : 0];
        let visited = 0;
        if (this.shaft > -1) {
            floor[this.shaft].v = true;
            visited++;
        }
        while (check.length > 0) {
            const next = check.pop();
            const tile = floor[next];
            if (tile.v) continue;
            visited++;
            tile.v = true;
            if (tile.n) check.push(next - this.size);
            if (tile.e) check.push(next + 1);
            if (tile.s) check.push(next + this.size);
            if (tile.w) check.push(next - 1);
        }
        return visited === this.size_sq;
    }

    update_distance(a_ind, b_ind, dist) {
        if (a_ind === this.shaft || b_ind === this.shaft) return;

        let a = a_ind * this.size_sq;
        let b = b_ind * this.size_sq;
        for (let i = 0; i < this.size_sq; i++) {
            if (dist[a] < dist[b]) dist[b] = dist[a] + 1;
            else if (dist[b] < dist[a]) dist[a] = dist[b] + 1;
            a++;
            b++;
        }
    }

    build_distance(floor) {
        let i;
        const dist = new Array(this.size_sq * this.size_sq + 1)
            .join("1")
            .split("")
            .map(function () {
                return 50;
            });
        for (i = 0; i < this.size_sq; i++) dist[i * this.size_sq + i] = 0;
        for (let r = 0; r < this.size_sq; r++) {
            for (i = 0; i < this.size_sq; i++) {
                if (floor[i].n) this.update_distance(i, i - this.size, dist);
                if (floor[i].e) this.update_distance(i, i + 1, dist);
                if (floor[i].s) this.update_distance(i, i + this.size, dist);
                if (floor[i].w) this.update_distance(i, i - 1, dist);
            }
        }
        return dist;
    }

    //from: index of tile
    //to: index of tile
    //options: array of [radians, neighbor's index]
    find_clockwise(from, to, options) {
        const dy = Math.floor(to / this.size) - Math.floor(from / this.size);
        const dx = (to % this.size) - (from % this.size);
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
    }

    walk(from, to, floor, dist) {
        if (from === this.shaft || to === this.shaft) return;

        let min;
        let shortest = [];
        let tile;

        const look = (dir, neighbor, r) => {
            const ind = neighbor * this.size_sq + to;
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
            look("n", from - this.size, Math.PI * -0.5);
            look("e", from + 1, 0);
            look("s", from + this.size, Math.PI * 0.5);
            look("w", from - 1, Math.PI);
            const next =
                shortest.length > 1
                    ? this.find_clockwise(from, to, shortest)
                    : shortest[0][1];
            floor[next].heat++;
            from = next;
        }
    }

    show_heat(show) {
        this.heatmap = show;
        if (this.heatmap) {
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
                const floor = this.to_floor(this.parseWalls(layout));
                this.generate_heatmap(floors[f].getAttribute("id"), floor);
            }
        }
        this.update_href();
    }

    update_job() {
        const j = document.getElementById("job") as HTMLSelectElement;
        const info = j.options[j.selectedIndex].value.split(":");
        this.floors = parseInt(info[0]);
        this.size = parseInt(info[1]);
        this.walls = parseInt(info[2]);
        this.shaft = -1;
        this.size_sq = this.size * this.size;
        this.update_dom();
    }

    get_walls(tile) {
        const dec = tile.size - 1;
        const max = 2 * this.size * dec;
        const off = tile % this.size;
        const row = Math.floor(tile / this.size) * (this.size + dec);
        const ind = row + off;
        const val = [];
        if (off > 0) val.push(ind - 1);
        if (off < dec) val.push(ind);
        if (ind >= this.size + dec) val.push(ind - this.size);
        if (ind + dec < max) val.push(ind + dec);
        return val;
    }

    generate(id?: string) {
        let f;
        let floors;
        const max = 2 * this.size * (this.size - 1);
        const permanent_walls = [];
        let shaft_walls = [];
        if (id === undefined || id === "all") {
            floors = document.getElementsByClassName("floor");
            if (this.size === 5) {
                if (this.shaft > -1) {
                    for (f = 0; f < floors.length; f++) {
                        const id = floors[f].getAttribute("id");
                        document.getElementById(id + "_t" + this.shaft).className = "tile";
                    }
                }
                this.shaft = Math.floor(Math.random() * this.size_sq);
            }
        } else {
            floors = [document.getElementById(id)];
        }
        if (this.shaft > -1) {
            shaft_walls = this.get_walls(this.shaft);
            shaft_walls.forEach(function (w) {
                permanent_walls[w] = true;
            });
        }
        for (f = 0; f < floors.length; f++) {
            const id = floors[f].getAttribute("id");
            while (true) {
                const wall = permanent_walls.slice();
                for (let w = 0; w < this.walls;) {
                    const n = Math.floor(Math.random() * max);
                    if (!wall[n]) {
                        w++;
                        wall[n] = true;
                    }
                }
                shaft_walls.forEach(function (w) {
                    wall[w] = false;
                });
                if (this.set_layout(id, wall)) {
                    break;
                }
            }
        }
        this.update_href();
    }

    generate_heatmap(id, floor) {
        let i;
        let j;
        let heat = [];
        if (!this.heatmap) {
            for (i = 0; i < this.size_sq; i++) {
                document.getElementById(id + "_t" + i).style.backgroundColor = "";
            }
            return;
        }

        const dist = this.build_distance(floor);
        for (i = 0; i < this.size_sq; i++) {
            for (j = 0; j < this.size_sq; j++) {
                this.walk(i, j, floor, dist);
            }
        }
        for (i = 0; i < this.size_sq; i++) {
            if (i !== this.shaft) {
                let heat = (1.0 - (floor[i].heat - (this.size_sq - 1)) / 168) * 240;
                document.getElementById(id + "_t" + i).style.backgroundColor =
                    "hsl(" + heat + ",100%,50%)";
            }
        }
        if (this.shaft > -1) {
            //When regenerating a level and changing the location of the shaft, if there was a heatmap, a backgroundColor will exist for the new location
            document.getElementById(id + "_t" + this.shaft).style.backgroundColor = "";
        }
        heat = [];
        for (let y = 0; y < this.size; y++) {
            const r = [];
            for (let x = 0; x < this.size; x++) {
                r.push(floor[y * this.size + x].heat);
            }
            heat.push(r);
        }
        let total_heat = 0;
        for (i = 0; i < this.size_sq; i++) {
            total_heat += floor[i].heat;
        }
    }

    set_layout(id, walls) {
        const floor = this.to_floor(walls);
        if (!this.valid(floor)) return false;
        const f = document.getElementById(id);
        f.setAttribute("layout", this.wallsToString(walls));
        if (this.shaft > -1) {
            document.getElementById(id + "_t" + this.shaft).className = "shaft";
        }
        for (let w = 0; w < this.size * (this.size - 1) * 2; w++) {
            document.getElementById(id + "_" + w).className = walls[w] ? "wall" : "";
        }
        this.generate_heatmap(id, floor);
        return true;
    }

    init() {
        const j = this.getParameterByName("job");
        if (j !== "") (document.getElementById("job") as HTMLSelectElement).options[j].selected = true;
        this.update_job();
        const s = this.getParameterByName("s");
        if (s !== "") this.shaft = parseInt(s, 36);
        if (this.getParameterByName("heat") !== "") {
            this.heatmap = true;
            const heat = document.getElementById("burgle_heat") as HTMLInputElement;
            if (heat !== null) heat.checked = this.heatmap;
        }
        let haveFloorsInUrl = false;
        const floors = document.getElementsByClassName("floor");
        for (let f = 0; f < floors.length; f++) {
            const layout = this.getParameterByName(floors[f].getAttribute("id"));
            if (layout) {
                this.set_layout(floors[f].getAttribute("id"), this.parseWalls(layout));
                haveFloorsInUrl = true;
            }
        }
        if (!haveFloorsInUrl) this.generate();
        else this.show_heat(this.heatmap);
    }

    update_dom() {
        const floorElem = document.getElementById("floors");
        while (floorElem.lastChild) {
            floorElem.removeChild(floorElem.lastChild);
        }

        const cols = this.size * 2 - 1;
        for (let f = 0; f < this.floors; f++) {
            const id = "f" + f;
            const container = document.createElement("div");
            container.setAttribute("class", "floorContainer");

            const floor = document.createElement("div");
            floor.setAttribute("class", (this.size === 5 ? "knox" : "bank") + " floor");
            floor.setAttribute("id", id);
            const table = document.createElement("table");
            let wall = 0;
            for (let i = 0; i < cols; i++) {
                const row = document.createElement("tr");
                for (let j = 0; j < cols; j++) {
                    const td = document.createElement("td");
                    if (i % 2 === 0 && j % 2 === 0) {
                        td.className = "tile";
                        td.setAttribute("id", id + "_t" + ((i / 2) * this.size + j / 2));
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
    }

    update_href() {
        let link = window.location.protocol + "//";
        link += window.location.hostname;
        if (window.location.port) link += ":" + window.location.port;
        link += window.location.pathname + "?job=";
        link += (document.getElementById("job") as HTMLSelectElement).selectedIndex;
        if (this.heatmap) link += "&heat=on";
        if (this.shaft > -1) link += "&s=" + this.shaft.toString(36);
        const floors = document.getElementsByClassName("floor");
        for (let f = 0; f < floors.length; f++) {
            link +=
                "&" +
                floors[f].getAttribute("id") +
                "=" +
                floors[f].getAttribute("layout");
        }
        (document.getElementById("burgle_href") as HTMLAnchorElement).href = link;
    }

    new_job() {
        this.update_job();
        this.generate();
    }

    default_job() {
        this.update_job();
        const job = (document.getElementById("job") as HTMLSelectElement).selectedIndex;
        this.shaft = job === 2 ? 12 : -1;
        const floors = document.getElementsByClassName("floor");
        for (let f = 0; f < floors.length; f++) {
            const layout = this.default_jobs[job][f];
            this.set_layout(floors[f].getAttribute("id"), this.parseWalls(layout));
        }
        this.show_heat(this.heatmap);
    }

}

// @ts-ignore
window.Burgle = new BurgleC()

