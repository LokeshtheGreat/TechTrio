document.addEventListener("DOMContentLoaded", () => {
    const cryptoBody = document.getElementById("crypto-body");
    const totalTracked = document.getElementById("total-tracked");
    const lastUpdate = document.getElementById("last-update");
    const topGainer = document.getElementById("top-gainer");
    const topLoser = document.getElementById("top-loser");
    const globalSearch = document.getElementById("global-search");
    const resetFiltersBtn = document.getElementById("reset-filters");
    const coinSelector = document.getElementById("coin-selector");
    const priceHistoryChart = document.getElementById("price-history-chart");
    const changeChart = document.getElementById("change-chart");

    // Popover Toggles
    const filterIcons = document.querySelectorAll(".filter-icon");
    filterIcons.forEach(icon => {
        icon.addEventListener("click", (e) => {
            e.stopPropagation();
            const targetId = icon.getAttribute("data-popover");
            const popover = document.getElementById(targetId);
            
            // Close others
            document.querySelectorAll(".popover").forEach(p => {
                if(p !== popover) p.classList.remove("show");
            });
            
            popover.classList.toggle("show");
        });
    });

    document.addEventListener("click", (e) => {
        if (!e.target.closest(".popover") && !e.target.closest(".filter-icon")) {
            document.querySelectorAll(".popover").forEach(p => p.classList.remove("show"));
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            document.querySelectorAll(".popover").forEach(p => p.classList.remove("show"));
        }
    });

    // Inputs inside popovers shouldn't close popover
    document.querySelectorAll(".popover").forEach(p => {
        p.addEventListener("click", e => e.stopPropagation());
    });

    let allData = [];
    let isFirstLoad = true;

    // Filter State
    let sortState = { col: null, dir: null };
    let gainerOnly = false;
    let loserOnly = false;
    // Operator-condition state for Price, Change, Cap
    let priceFilter  = { op: "gte", val: "" };
    let changeFilter = { op: "gte", val: "" };
    let capFilter    = { op: "gte", val: "" };

    // Filter Elements (retained for rank/asset)
    const fMinRank   = document.getElementById("f-min-rank");
    const fMaxRank   = document.getElementById("f-max-rank");
    const fAssetName = document.getElementById("f-asset-name");
    // Operator filter elements
    const fPriceOp   = document.getElementById("f-price-op");
    const fPriceVal  = document.getElementById("f-price-val");
    const fChangeOp  = document.getElementById("f-change-op");
    const fChangeVal = document.getElementById("f-change-val");
    const fCapOp     = document.getElementById("f-cap-op");
    const fCapVal    = document.getElementById("f-cap-val");
    const btnGainers = document.getElementById("btn-gainers");
    const btnLosers  = document.getElementById("btn-losers");

    btnGainers.addEventListener("click", () => {
        gainerOnly = !gainerOnly;
        if(gainerOnly) { loserOnly = false; btnLosers.classList.remove("active"); }
        btnGainers.classList.toggle("active", gainerOnly);
        processData(false);
    });

    btnLosers.addEventListener("click", () => {
        loserOnly = !loserOnly;
        if(loserOnly) { gainerOnly = false; btnGainers.classList.remove("active"); }
        btnLosers.classList.toggle("active", loserOnly);
        processData(false);
    });

    // Sort buttons
    document.querySelectorAll(".sort-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            sortState.col = btn.getAttribute("data-col");
            sortState.dir = btn.getAttribute("data-dir");
            document.querySelectorAll(".popover").forEach(p => p.classList.remove("show"));
            processData(false);
        });
    });

    // Apply buttons: commit operator + value into filter state then filter
    document.querySelectorAll(".btn-apply").forEach(btn => {
        btn.addEventListener("click", () => {
            const col = btn.getAttribute("data-col");
            if (col === "price") {
                priceFilter.op  = fPriceOp.value;
                priceFilter.val = fPriceVal.value.trim();
            } else if (col === "change") {
                changeFilter.op  = fChangeOp.value;
                changeFilter.val = fChangeVal.value.trim();
            } else if (col === "cap") {
                capFilter.op  = fCapOp.value;
                capFilter.val = fCapVal.value.trim();
            }
            document.querySelectorAll(".popover").forEach(p => p.classList.remove("show"));
            processData(false);
        });
    });

    // Simple live-filter inputs (rank, asset, global search)
    const liveInputs = [globalSearch, fMinRank, fMaxRank, fAssetName];
    liveInputs.forEach(input => {
        if(input) input.addEventListener("input", () => processData(false));
    });

    // Reset
    resetFiltersBtn.addEventListener("click", () => {
        if(globalSearch) globalSearch.value = "";
        if(fMinRank)  fMinRank.value = "";
        if(fMaxRank)  fMaxRank.value = "";
        if(fAssetName) fAssetName.value = "";
        // Clear operator filter inputs
        if(fPriceOp)  fPriceOp.value  = "gte";
        if(fPriceVal) fPriceVal.value  = "";
        if(fChangeOp) fChangeOp.value = "gte";
        if(fChangeVal) fChangeVal.value = "";
        if(fCapOp)    fCapOp.value    = "gte";
        if(fCapVal)   fCapVal.value   = "";
        // Clear committed state
        priceFilter  = { op: "gte", val: "" };
        changeFilter = { op: "gte", val: "" };
        capFilter    = { op: "gte", val: "" };
        sortState    = { col: null, dir: null };
        gainerOnly   = false;
        loserOnly    = false;
        btnGainers.classList.remove("active");
        btnLosers.classList.remove("active");
        processData(false);
    });

    // ── Numeric helpers ──────────────────────────────────────────────────────
    function parseCurrency(str) {
        // Strips $ and commas: "$79,921.50" → 79921.50
        return parseFloat(String(str).replace(/[$,\s]/g, ""));
    }

    function parseCap(str) {
        // Converts display strings like "$1.65T", "$2.41B", "$985.2M", "$500K"
        // into real absolute numbers for numeric comparison.
        const s = String(str).replace(/[$,\s]/g, "").toUpperCase();
        let num = parseFloat(s);
        if (isNaN(num)) return NaN;
        if (s.includes("T")) return num * 1e12;
        if (s.includes("B")) return num * 1e9;
        if (s.includes("M")) return num * 1e6;
        if (s.includes("K")) return num * 1e3;
        return num;
    }

    function parseChange(str) {
        // Handles "+3.14%" or "-0.51%" or "3.14"
        return parseFloat(String(str).replace(/[%+\s]/g, ""));
    }

    function applyOp(value, op, threshold) {
        if (isNaN(threshold)) return true; // No valid threshold — pass all rows
        switch(op) {
            case "gt":  return value >  threshold;
            case "gte": return value >= threshold;
            case "lt":  return value <  threshold;
            case "lte": return value <= threshold;
            case "eq":  return Math.abs(value - threshold) < 1e-9;
            default:    return true;
        }
    }

    function processData(isInitial) {
        let filtered = [...allData];

        // 1. Global Search
        const gSearch = globalSearch ? globalSearch.value.toLowerCase().trim() : "";
        if(gSearch) filtered = filtered.filter(c => c.name.toLowerCase().includes(gSearch));

        // 2. Rank
        const minR = parseInt(fMinRank ? fMinRank.value : "");
        const maxR = parseInt(fMaxRank ? fMaxRank.value : "");
        if(!isNaN(minR)) filtered = filtered.filter(c => c.rank >= minR);
        if(!isNaN(maxR)) filtered = filtered.filter(c => c.rank <= maxR);

        // 3. Asset name (popover search)
        const aName = fAssetName ? fAssetName.value.toLowerCase().trim() : "";
        if(aName) filtered = filtered.filter(c => c.name.toLowerCase().includes(aName));

        // 4. Price — operator-condition
        if (priceFilter.val !== "") {
            const threshold = parseCurrency(priceFilter.val);
            filtered = filtered.filter(c => applyOp(parseCurrency(c.price), priceFilter.op, threshold));
        }

        // 5. 24h Change — operator-condition
        filtered = filtered.filter(c => {
            const chg = parseChange(c.change_24h);
            if (changeFilter.val !== "") {
                const threshold = parseFloat(changeFilter.val);
                if (!applyOp(chg, changeFilter.op, threshold)) return false;
            }
            if (gainerOnly && chg < 0) return false;
            if (loserOnly  && chg >= 0) return false;
            return true;
        });

        // 6. Market Cap — operator-condition
        if (capFilter.val !== "") {
            const threshold = parseCap(capFilter.val);
            filtered = filtered.filter(c => applyOp(parseCap(c.market_cap), capFilter.op, threshold));
        }

        // Sorting
        if (sortState.col) {
            filtered.sort((a, b) => {
                let valA, valB;
                if(sortState.col === "rank")   { valA = a.rank; valB = b.rank; }
                else if(sortState.col === "asset")  { valA = a.name.toLowerCase(); valB = b.name.toLowerCase(); }
                else if(sortState.col === "price")  { valA = parseCurrency(a.price); valB = parseCurrency(b.price); }
                else if(sortState.col === "change") { valA = parseChange(a.change_24h); valB = parseChange(b.change_24h); }
                else if(sortState.col === "cap")    { valA = parseCap(a.market_cap);  valB = parseCap(b.market_cap); }

                if(valA < valB) return sortState.dir === "asc" ? -1 : 1;
                if(valA > valB) return sortState.dir === "asc" ? 1 : -1;
                return 0;
            });
        }

        renderTable(filtered, isInitial);
        updateActiveFilterIcons();
    }

    function updateActiveFilterIcons() {
        document.querySelectorAll(".filter-icon").forEach(icon => icon.classList.remove("active"));

        if ((fMinRank && fMinRank.value) || (fMaxRank && fMaxRank.value) || sortState.col === "rank")
            document.querySelector('[data-popover="pop-rank"]').classList.add("active");

        if ((fAssetName && fAssetName.value) || sortState.col === "asset")
            document.querySelector('[data-popover="pop-asset"]').classList.add("active");

        if (priceFilter.val !== "" || sortState.col === "price")
            document.querySelector('[data-popover="pop-price"]').classList.add("active");

        if (changeFilter.val !== "" || gainerOnly || loserOnly || sortState.col === "change")
            document.querySelector('[data-popover="pop-change"]').classList.add("active");

        if (capFilter.val !== "" || sortState.col === "cap")
            document.querySelector('[data-popover="pop-cap"]').classList.add("active");
    }

    function renderTable(data, isInitialLoad) {
        if (totalTracked) totalTracked.textContent = data.length;
        
        let gainer = {name: "-", change: -Infinity};
        let loser = {name: "-", change: Infinity};
        let rowsHtml = "";
        
        data.forEach(coin => {
            const changeFloat = parseFloat(coin.change_24h.replace("%", ""));
            if (!isNaN(changeFloat)) {
                if (changeFloat > gainer.change) gainer = {name: coin.name, change: changeFloat};
                if (changeFloat < loser.change) loser = {name: coin.name, change: changeFloat};
            }

            const isPositive = changeFloat >= 0;
            const changeClass = isPositive ? "positive" : "negative";
            const sign = isPositive && changeFloat > 0 ? "+" : "";
            const rowClass = isInitialLoad ? "" : "updated-row";

            const slug = coin.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            const isStarred = typeof watchlist !== 'undefined' && watchlist.includes(slug);
            const starIcon = isStarred ? "⭐" : "☆";

            rowsHtml += `
                <tr class="${rowClass}" data-slug="${slug}">
                    <td class="col-star"><button class="star-btn" data-slug="${slug}" onclick="toggleWatchlist('${slug}')">${starIcon}</button></td>
                    <td class="col-rank">${coin.rank}</td>
                    <td class="col-asset">${coin.name}</td>
                    <td class="col-price">${coin.price}</td>
                    <td class="col-change ${changeClass}">${sign}${coin.change_24h}</td>
                    <td class="col-cap">${coin.market_cap}</td>
                </tr>
            `;
        });

        if (cryptoBody) cryptoBody.innerHTML = rowsHtml;
        if (topGainer && gainer.name !== "-") topGainer.textContent = `${gainer.name} (+${gainer.change}%)`;
        if (topLoser && loser.name !== "-") topLoser.textContent = `${loser.name} (${loser.change}%)`;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRICE HISTORY CANVAS CHART (REUSABLE CLASS)
    // ══════════════════════════════════════════════════════════════════════════

class PriceHistoryChart {
    constructor(container, coinSlug) {
        this.container = container;
        this.coinSlug = coinSlug;
        this.canvas = container.querySelector("canvas");
        this.emptyMsg = container.querySelector(".chart-empty");
        this.modeGroup = container.querySelector(".chart-mode-group") || container.querySelector("#chart-mode-group");
        this.rangeGroup = container.querySelector(".chart-range-group") || container.querySelector("#chart-range-group");
        this.customControls = container.querySelector(".chart-custom-controls");
        this.customStart = container.querySelector(".chart-custom-start");
        this.customEnd = container.querySelector(".chart-custom-end");
        
        this.chartMode = "price";
        this.chartRange = "all";
        this.chartRawData = [];

        this.initEvents();
        if (coinSlug) this.loadChartForCoin(coinSlug);
    }

    initEvents() {
        if (this.modeGroup) {
            this.modeGroup.addEventListener("click", e => {
                const btn = e.target.closest(".chart-btn");
                if (!btn) return;
                this.chartMode = btn.getAttribute("data-mode");
                this.setActiveBtn(this.modeGroup, "data-mode", this.chartMode);
                this.drawChart();
            });
        }

        if (this.rangeGroup) {
            this.rangeGroup.addEventListener("click", e => {
                const btn = e.target.closest(".chart-btn");
                if (!btn) return;
                this.chartRange = btn.getAttribute("data-range");
                this.setActiveBtn(this.rangeGroup, "data-range", this.chartRange);
                if (this.customControls) {
                    this.customControls.style.display = this.chartRange === "custom" ? "flex" : "none";
                }
                this.drawChart();
            });
        }
        
        if (this.customStart) {
            this.customStart.addEventListener("change", () => {
                if (this.customEnd && this.customStart.value) this.customEnd.min = this.customStart.value;
                if (this.chartRange === "custom") this.drawChart();
            });
        }
        if (this.customEnd) {
            this.customEnd.addEventListener("change", () => {
                if (this.customStart && this.customEnd.value) this.customStart.max = this.customEnd.value;
                if (this.chartRange === "custom") this.drawChart();
            });
        }

        if (this.canvas) {
            this.canvas.addEventListener("mousemove", e => this.handleMouseMove(e));
            this.canvas.addEventListener("mouseleave", () => this.drawChart());
        }

        if (this.canvas && this.canvas.parentElement) {
            this.resizeObserver = new ResizeObserver(() => {
                if (this.chartRawData && this.chartRawData.length) this.drawChart();
            });
            this.resizeObserver.observe(this.canvas.parentElement);
        }
    }

    destroy() {
        if (this.resizeObserver) this.resizeObserver.disconnect();
    }

    setActiveBtn(group, attr, value) {
        group.querySelectorAll(".chart-btn").forEach(b => {
            b.classList.toggle("active", b.getAttribute(attr) === value);
        });
    }

    loadChartForCoin(slug) {
        if (!slug) return;
        this.coinSlug = slug;
        fetch(`/api/history/${slug}`)
            .then(r => r.json())
            .then(d => {
                if (d.status === "ok") {
                    this.chartRawData = d.data.map(row => ({
                        ts: new Date(row.ts),
                        price: parseCurrency(row.price)
                    })).filter(row => !isNaN(row.price) && !isNaN(row.ts.getTime()));
                } else {
                    this.chartRawData = [];
                }
                this.drawChart();
            })
            .catch(() => { this.chartRawData = []; this.drawChart(); });
    }

    applyRangeFilter(data) {
        if (!data.length) return data;
        if (this.chartRange === "all") return data;
        
        if (this.chartRange === "custom") {
            const startVal = this.customStart ? this.customStart.value : "";
            const endVal = this.customEnd ? this.customEnd.value : "";
            if (!startVal && !endVal) return data; // if neither is set, just show all data
            
            let filtered = data;
            if (startVal) {
                const sDate = new Date(startVal);
                if (!isNaN(sDate)) filtered = filtered.filter(p => p.ts >= sDate);
            }
            if (endVal) {
                const eDate = new Date(endVal);
                if (!isNaN(eDate)) filtered = filtered.filter(p => p.ts <= eDate);
            }
            return filtered; // If empty, return [] so drawChart shows emptyMsg
        }

        const now = new Date();
        const cutoff = new Date(now);
        if (this.chartRange === "24h") cutoff.setHours(cutoff.getHours() - 24);
        else if (this.chartRange === "7d") cutoff.setDate(cutoff.getDate() - 7);
        const filtered = data.filter(p => p.ts >= cutoff);
        return filtered.length > 0 ? filtered : data;
    }

    buildSeries(data) {
        if (!data.length) return [];
        if (this.chartMode === "price") {
            return data.map(p => ({ x: p.ts, y: p.price, origPrice: p.price }));
        }
        const first = data[0].price;
        if (first === 0) return data.map(p => ({ x: p.ts, y: 0, origPrice: p.price }));
        return data.map(p => ({
            x: p.ts,
            y: ((p.price - first) / first) * 100,
            origPrice: p.price
        }));
    }

    fmtPrice(v) {
        if (v >= 1000) return "$" + v.toLocaleString(undefined, {maximumFractionDigits: 0});
        if (v >= 1)    return "$" + v.toFixed(2);
        if (v >= 0.01) return "$" + v.toFixed(4);
        return "$" + v.toFixed(6);
    }

    fmtPct(v) { return (v >= 0 ? "+" : "") + v.toFixed(2) + "%"; }

    fmtTime(d) {
        const now = new Date();
        const diffH = (now - d) / 3600000;
        if (diffH < 24) return d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
        return d.toLocaleDateString([], {month:"short", day:"numeric"}) + " " +
               d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    }

    drawChart() {
        if (!this.canvas) return;

        const ctx = this.canvas.getContext("2d");
        const dpr = window.devicePixelRatio || 1;

        const rect = this.canvas.getBoundingClientRect();
        const cssW = rect.width || this.canvas.parentElement.getBoundingClientRect().width || 600;
        const cssH = 320; 
        
        this.canvas.width  = cssW * dpr;
        this.canvas.height = cssH * dpr;
        this.canvas.style.height = cssH + "px";
        
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cssW, cssH);

        const filtered = this.applyRangeFilter(this.chartRawData);
        const series   = this.buildSeries(filtered);

        if (!series.length) {
            if (this.emptyMsg) {
                this.emptyMsg.textContent = this.chartRange === "custom" ? "No data available for this range" : "No data available";
                this.emptyMsg.style.display = "";
            }
            return;
        }
        if (this.emptyMsg) this.emptyMsg.style.display = "none";

        const ML = 80, MR = 24, MT = 20, MB = 40;
        const W = cssW - ML - MR;
        const H = cssH - MT - MB;

        const ys   = series.map(p => p.y);
        let yMin   = Math.min(...ys);
        let yMax   = Math.max(...ys);
        const yRng = yMax - yMin;

        if (yRng === 0) {
            const pad = Math.abs(yMin) * 0.001 || 0.001;
            yMin -= pad; yMax += pad;
        } else if (this.chartMode === "pct") {
            const pad = Math.max(yRng * 0.15, 0.05);
            yMin -= pad; yMax += pad;
        } else {
            const relRange = yRng / Math.abs((yMin + yMax) / 2);
            if (relRange < 0.005) {
                const pad = yRng * 0.5;
                yMin -= pad; yMax += pad;
            } else {
                const pad = yRng * 0.08;
                yMin -= pad; yMax += pad;
            }
        }

        const xs  = series.map(p => p.x.getTime());
        const xMin = Math.min(...xs);
        const xMax = Math.max(...xs);
        const xRng = xMax - xMin || 1;

        const toX = t => ML + ((t - xMin) / xRng) * W;
        const toY = v => MT + H - ((v - yMin) / (yMax - yMin)) * H;

        const gridColor   = "#f0f0f0";
        const axisColor   = "#e5e7eb";
        const labelColor  = "#6b7280";
        const lineColor   = "#2563eb";
        const dotColor    = "#2563eb";

        ctx.strokeStyle = axisColor;
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.moveTo(ML, MT); ctx.lineTo(ML, MT + H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ML, MT + H); ctx.lineTo(ML + W, MT + H); ctx.stroke();

        const yTicks = 5;
        ctx.font = "500 12px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
        ctx.fillStyle = labelColor;
        ctx.textAlign = "right";
        for (let i = 0; i <= yTicks; i++) {
            const v = yMin + (yMax - yMin) * (i / yTicks);
            const py = toY(v);
            ctx.strokeStyle = gridColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(ML, py); ctx.lineTo(ML + W, py); ctx.stroke();
            ctx.setLineDash([]);
            const label = this.chartMode === "pct" ? this.fmtPct(v) : this.fmtPrice(v);
            ctx.fillText(label, ML - 8, py + 4);
        }

        ctx.textAlign = "center";
        ctx.fillStyle = labelColor;
        const minTickSpacing = 110;
        const maxXTicks = Math.max(2, Math.floor(W / minTickSpacing));
        
        const xLabels = [];
        for (let i = 0; i < maxXTicks; i++) {
            const t = xMin + (xRng * (i / (maxXTicks - 1)));
            xLabels.push(new Date(t));
        }

        const lastPx = toX(xMax);
        for (let i = 0; i < xLabels.length - 1; i++) {
            const px = toX(xLabels[i].getTime());
            if (lastPx - px > minTickSpacing * 0.8) {
                ctx.fillText(this.fmtTime(xLabels[i]), px, MT + H + 20);
            }
        }
        ctx.fillText(this.fmtTime(new Date(xMax)), lastPx, MT + H + 20);

        const grad = ctx.createLinearGradient(0, MT, 0, MT + H);
        grad.addColorStop(0, "rgba(37,99,235,0.12)");
        grad.addColorStop(1, "rgba(37,99,235,0)");

        ctx.beginPath();
        ctx.moveTo(toX(series[0].x.getTime()), toY(series[0].y));
        for (let i = 1; i < series.length; i++) {
            ctx.lineTo(toX(series[i].x.getTime()), toY(series[i].y));
        }
        ctx.lineTo(toX(series[series.length-1].x.getTime()), MT + H);
        ctx.lineTo(toX(series[0].x.getTime()), MT + H);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = lineColor;
        ctx.lineWidth   = 2;
        ctx.lineJoin    = "round";
        ctx.moveTo(toX(series[0].x.getTime()), toY(series[0].y));
        for (let i = 1; i < series.length; i++) {
            ctx.lineTo(toX(series[i].x.getTime()), toY(series[i].y));
        }
        ctx.stroke();

        if (series.length <= 60) {
            ctx.fillStyle = dotColor;
            series.forEach(p => {
                ctx.beginPath();
                ctx.arc(toX(p.x.getTime()), toY(p.y), 3, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        this.canvas._series  = series;
        this.canvas._toX     = toX;
        this.canvas._toY     = toY;
        this.canvas._ML      = ML; this.canvas._MT = MT; this.canvas._H = H; this.canvas._W = W;
        this.canvas._cssW    = cssW; this.canvas._cssH = cssH;
    }

    handleMouseMove(e) {
        if (!this.canvas._series || !this.canvas._series.length) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const logicalScaleX = this.canvas._cssW / rect.width;
        const mx = (e.clientX - rect.left) * logicalScaleX;

        const { _series: series, _toX: toX, _toY: toY,
                _ML: ML, _MT: MT, _H: H, _W: W, _cssW: cssW } = this.canvas;

        let nearest = null, minDist = Infinity;
        series.forEach(p => {
            const px = toX(p.x.getTime());
            const dx = Math.abs(px - mx);
            if (dx < minDist) { minDist = dx; nearest = p; }
        });
        
        if (!nearest || minDist > W / 2) return;

        const px = toX(nearest.x.getTime());
        const py = toY(nearest.y);
        
        const ctx2 = this.canvas.getContext("2d");

        this.drawChart();
        ctx2.save();

        ctx2.strokeStyle = "#9ca3af";
        ctx2.lineWidth   = 1;
        ctx2.setLineDash([4, 4]);
        ctx2.beginPath(); ctx2.moveTo(px, MT); ctx2.lineTo(px, MT + H); ctx2.stroke();
        ctx2.setLineDash([]);

        ctx2.fillStyle = "#2563eb";
        ctx2.beginPath(); ctx2.arc(px, py, 5, 0, Math.PI * 2); ctx2.fill();
        ctx2.strokeStyle = "#fff";
        ctx2.lineWidth = 2;
        ctx2.beginPath(); ctx2.arc(px, py, 5, 0, Math.PI * 2); ctx2.stroke();

        const priceLabel  = this.fmtPrice(nearest.origPrice);
        const changeLabel = this.chartMode === "pct" ? this.fmtPct(nearest.y) : "";
        const timeLabel   = this.fmtTime(nearest.x);
        const line1 = priceLabel + (changeLabel ? "  " + changeLabel : "");
        const line2 = timeLabel;

        ctx2.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
        const tw1 = ctx2.measureText(line1).width;
        ctx2.font = "500 12px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
        const tw2 = ctx2.measureText(line2).width;
        const tw  = Math.max(tw1, tw2) + 20;
        const th  = 46;

        let tx = px + 12;
        let ty = py - th / 2;
        if (tx + tw > cssW - 10) tx = px - tw - 12;
        if (ty < MT) ty = MT;
        if (ty + th > MT + H) ty = MT + H - th;

        ctx2.fillStyle = "rgba(255,255,255,0.98)";
        ctx2.strokeStyle = "#d1d5db";
        ctx2.lineWidth = 1;
        ctx2.beginPath(); ctx2.roundRect(tx, ty, tw, th, 6); ctx2.fill(); ctx2.stroke();

        ctx2.fillStyle = "#111827";
        ctx2.font = "bold 13px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
        ctx2.textAlign = "left";
        ctx2.fillText(line1, tx + 10, ty + 18);
        ctx2.fillStyle = "#6b7280";
        ctx2.font = "500 12px -apple-system, BlinkMacSystemFont, 'Inter', sans-serif";
        ctx2.fillText(line2, tx + 10, ty + 34);
        ctx2.restore();
    }
}


let watchlist = JSON.parse(localStorage.getItem('cryptoWatchlist') || '[]');
let expandedPortfolioSlug = null;
let activePortfolioChart = null;
let mainDashboardChart = null;

function toggleWatchlist(slug) {
    if (watchlist.includes(slug)) {
        watchlist = watchlist.filter(s => s !== slug);
        if (expandedPortfolioSlug === slug) {
            collapsePortfolioRow(slug);
        }
    } else {
        watchlist.push(slug);
    }
    localStorage.setItem('cryptoWatchlist', JSON.stringify(watchlist));
    renderPortfolio();
    // Refresh table to show correct star icons
    if (cryptoBody) {
        processData(false);
    }
}

function renderPortfolio() {
    const list = document.getElementById("portfolio-list");
    const empty = document.getElementById("portfolio-empty");
    if (!list || !empty) return;

    if (watchlist.length === 0) {
        list.style.display = "none";
        empty.style.display = "block";
        list.innerHTML = "";
        return;
    }

    list.style.display = "flex";
    empty.style.display = "none";

    // Clean up removed items
    const existingSlugs = Array.from(list.querySelectorAll('.portfolio-row')).map(el => el.dataset.slug);
    existingSlugs.forEach(slug => {
        if (!watchlist.includes(slug)) {
            const el = list.querySelector(`.portfolio-row[data-slug="${slug}"]`);
            if (el) el.remove();
        }
    });

    // Sort or just keep order of watchlist array
    watchlist.forEach(slug => {
        const coin = allData.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === slug);
        if (!coin) return;

        let row = list.querySelector(`.portfolio-row[data-slug="${slug}"]`);
        if (!row) {
            row = document.createElement("div");
            row.className = "portfolio-row";
            row.dataset.slug = slug;
            row.innerHTML = `
                <div class="portfolio-header">
                    <span class="p-name">⭐ ${coin.name}</span>
                </div>
                <div class="portfolio-body"></div>
            `;
            
            // Interaction logic
            // Mouse for desktop
            row.addEventListener("mouseenter", () => expandPortfolioRow(slug));
            row.addEventListener("mouseleave", () => collapsePortfolioRow(slug));
            
            // Click for mobile/tablet
            row.querySelector('.portfolio-header').addEventListener("click", () => {
                if (expandedPortfolioSlug === slug) {
                    collapsePortfolioRow(slug);
                } else {
                    expandPortfolioRow(slug);
                }
            });
            
            list.appendChild(row);
        }

        // Update values without destroying children
        const isExpanded = row.classList.contains("expanded");
        
        const hasAlert = typeof alerts !== 'undefined' && alerts.some(a => a.coin === coin.name);
        const alertIcon = hasAlert ? ' <span style="color:#f59e0b; font-size:12px; margin-left: 6px;" title="Active Alerts">🔔</span>' : '';
        row.querySelector('.p-name').innerHTML = `⭐ ${coin.name}${alertIcon}`;

        if (isExpanded) {
            const changeFloat = parseFloat(coin.change_24h.replace("%", ""));
            row.querySelector('.p-price').textContent = coin.price;
            const sign = changeFloat > 0 ? '+' : '';
            row.querySelector('.p-change').textContent = sign + coin.change_24h;
            row.querySelector('.p-change').className = 'p-change ' + (changeFloat >= 0 ? 'positive' : 'negative');
            row.querySelector('.p-cap').textContent = coin.market_cap;
        }
    });
}

function expandPortfolioRow(slug) {
    if (expandedPortfolioSlug === slug) return;
    
    if (expandedPortfolioSlug) {
        collapsePortfolioRow(expandedPortfolioSlug);
    }

    expandedPortfolioSlug = slug;
    const row = document.querySelector(`.portfolio-row[data-slug="${slug}"]`);
    if (!row) return;

    // Reset styles that might have been hardcoded
    
    const body = row.querySelector('.portfolio-body');
    body.style.display = "";
    body.innerHTML = `
        <div class="p-metrics-vertical" style="display:flex; flex-direction:column; gap:12px; margin-bottom:16px;">
            <div class="p-metric-block-v" style="display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
                <span class="p-label" style="font-size:11px; font-weight:600; color:#64748b; letter-spacing:0.05em;">CURRENT PRICE</span>
                <span class="p-price" style="font-weight:600; font-size:15px; color:#0f172a;"></span>
            </div>
            <div class="p-metric-block-v" style="display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
                <span class="p-label" style="font-size:11px; font-weight:600; color:#64748b; letter-spacing:0.05em;">24H CHANGE</span>
                <span class="p-change" style="font-weight:600; font-size:15px;"></span>
            </div>
            <div class="p-metric-block-v" style="display:flex; flex-direction:column; align-items:flex-start; gap:2px;">
                <span class="p-label" style="font-size:11px; font-weight:600; color:#64748b; letter-spacing:0.05em;">MARKET CAP</span>
                <span class="p-cap" style="font-size:14px; font-weight:500; color:#475569;"></span>
            </div>
        </div>

        <div style="margin-bottom: 16px;">
            <button class="btn-reset" onclick="togglePortfolioAlerts('${slug}')" style="padding: 4px 12px; font-size: 13px; display:inline-flex; align-items:center; gap: 4px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                Alert
            </button>
        </div>

        <div id="inline-alert-${slug}" style="display:none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 16px; margin-top: 12px; margin-bottom: 20px;">
            <div style="font-size:12px; font-weight:600; color:#64748b; margin-bottom:10px; text-transform:uppercase;">Create Alert</div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <select class="al-select inline-al-metric" style="padding:6px 8px;">
                    <option value="price">Price</option>
                    <option value="change">24h Change</option>
                    <option value="cap">Market Cap</option>
                </select>
                <select class="al-select inline-al-op" style="padding:6px 8px;">
                    <option value="gt">&gt;</option>
                    <option value="gte">&gt;=</option>
                    <option value="lt">&lt;</option>
                    <option value="lte">&lt;=</option>
                </select>
                <input type="text" class="al-input inline-al-val" placeholder="e.g. 80000 or 5%" style="padding:6px 8px; width:120px;">
                <button class="btn-al-add" onclick="submitPortfolioAlert('${slug}')" style="padding:6px 14px;">+ Add</button>
            </div>
            <div class="inline-al-error hidden" style="color:#ef4444; font-size:11px; margin-top:6px;"></div>
        </div>

        <div class="chart-controls">
            <div class="chart-btn-group chart-mode-group">
                <button class="chart-btn active" data-mode="price">Price</button>
                <button class="chart-btn" data-mode="pct">% Change</button>
            </div>
            <div class="chart-btn-group chart-range-group">
                <button class="chart-btn active" data-range="all">All</button>
                <button class="chart-btn" data-range="7d">7d</button>
                <button class="chart-btn" data-range="24h">24h</button>
                <button class="chart-btn" data-range="custom">Custom</button>
            </div>
            <div class="chart-custom-controls" style="display:none; align-items:center; gap:8px;">
                <input type="datetime-local" class="chart-custom-start" style="padding:4px 6px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px; outline:none; color:#334155; background:#fff;">
                <span style="font-size:12px; color:#64748b;">to</span>
                <input type="datetime-local" class="chart-custom-end" style="padding:4px 6px; font-size:12px; border:1px solid #cbd5e1; border-radius:4px; outline:none; color:#334155; background:#fff;">
            </div>
        </div>
        <div class="canvas-wrapper">
            <canvas class="portfolio-canvas"></canvas>
            <div class="chart-empty chart-empty-msg" style="display:none">No data available</div>
        </div>
    `;

    activePortfolioChart = new PriceHistoryChart(body, slug);
    row.classList.add("expanded");
    
    // Trigger immediate update of text metrics
    renderPortfolio();
}

function collapsePortfolioRow(slug) {
    const row = document.querySelector(`.portfolio-row[data-slug="${slug}"]`);
    if (row) {
        row.classList.remove("expanded");
        const body = row.querySelector('.portfolio-body');
        setTimeout(() => {
            if (!row.classList.contains("expanded")) {
                body.innerHTML = "";
            }
        }, 300);
    }
    if (expandedPortfolioSlug === slug) {
        expandedPortfolioSlug = null;
        if (activePortfolioChart) {
            activePortfolioChart.destroy();
            activePortfolioChart = null;
        }
    }
}

// ── Inside window.onload or DOMContentLoaded init ──
// Initialize Main Dashboard Chart
function initMainChart() {
    const mainChartContainer = document.querySelector('.charts-section .chart-card');
    if (mainChartContainer && coinSelector) {
        mainDashboardChart = new PriceHistoryChart(mainChartContainer, coinSelector.value);
        coinSelector.addEventListener("change", () => {
            mainDashboardChart.loadChartForCoin(coinSelector.value);
        });
    }

    // Mobile click-outside to collapse portfolio
    document.addEventListener("click", e => {
        if (expandedPortfolioSlug && !e.target.closest('.portfolio-row')) {
            collapsePortfolioRow(expandedPortfolioSlug);
        }
    });
}


    function updateCoinSelector() {
        if (!coinSelector) return;
        const currentSelected = coinSelector.value;
        coinSelector.innerHTML = "";
        allData.slice(0, 10).forEach(coin => {
            const safeName = coin.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            const opt = document.createElement("option");
            opt.value = safeName;
            opt.textContent = coin.name;
            coinSelector.appendChild(opt);
        });
        if (currentSelected && Array.from(coinSelector.options).some(o => o.value === currentSelected)) {
            coinSelector.value = currentSelected;
        } else {
            coinSelector.selectedIndex = 0;
        }
        
        // Load chart for selected coin
        const slug = coinSelector.value;
        if (mainDashboardChart && slug) {
            if (mainDashboardChart.coinSlug !== slug) {
                mainDashboardChart.loadChartForCoin(slug);
            } else {
                mainDashboardChart.drawChart();
            }
        }
    }

    let lastUpdateStr = "";

    function fetchData() {
        fetch("/api/data")
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    // Check stale status (>90s since last update means it missed ~3 scrapes)
                    const isStale = data.last_update === "Never" || (new Date() - new Date(data.last_update) > 90000);
                    const liveDot = document.querySelector('.live-dot');
                    const liveText = document.querySelector('.live-text');
                    if (liveDot) {
                        liveDot.style.backgroundColor = isStale ? 'var(--negative)' : 'var(--positive)';
                        liveDot.style.animation = isStale ? 'none' : 'pulse 2s infinite';
                    }
                    if (liveText) {
                        liveText.textContent = isStale ? 'Stale' : 'Live';
                    }

                    if (data.last_update === lastUpdateStr) {
                        return; // Data hasn't changed, skip heavy DOM/Image updates
                    }
                    
                    lastUpdateStr = data.last_update;
                    allData = data.data;
                    if(lastUpdate) lastUpdate.textContent = data.last_update;
                    
                    if(isFirstLoad) {
                        if (!mainDashboardChart && typeof initMainChart === 'function') {
                            initMainChart();
                        }
                        updateCoinSelector();
                    }
                    processData(isFirstLoad);
                    isFirstLoad = false;
                    
                    // Alert system hooks — sync coin list and evaluate conditions
                    syncAlertCoinOptions();
                    evaluateAlerts();

                    if (typeof renderPortfolio === 'function') renderPortfolio();

                    const timestamp = new Date().getTime();
                    if(changeChart) changeChart.src = `/static/images/change_chart.png?t=${timestamp}`;
                    if(mainDashboardChart && mainDashboardChart.coinSlug) mainDashboardChart.loadChartForCoin(mainDashboardChart.coinSlug);
                }
            })
            .catch(error => console.error("Error fetching data:", error));
    }

    fetchData();
    setInterval(fetchData, 3000); // 3s polling interval

    // ══════════════════════════════════════════════════════════════════════════
    // ALERT SYSTEM
    // ══════════════════════════════════════════════════════════════════════════

    // Each alert: { id, coin, metric, op, threshold, armed, label }
    // armed = true  → condition was false last time we checked; can trigger
    // armed = false → condition was true last time; suppressed until it goes false again
    let alerts = [];
    let alertIdCounter = 0;

    const alertsPanel  = document.getElementById("alerts-panel");
    const btnToggle    = document.getElementById("btn-toggle-alerts");
    const alertBadge   = document.getElementById("alert-badge");
    const alertList    = document.getElementById("alert-list");
    const alCoinSel    = document.getElementById("al-coin");
    const alMetricSel  = document.getElementById("al-metric");
    const alOpSel      = document.getElementById("al-op");
    const alValInput   = document.getElementById("al-val");
    const alAddBtn     = document.getElementById("al-add");
    const alError      = document.getElementById("al-error");
    const toastContainer = document.getElementById("toast-container");

    // Toggle panel open/closed
    btnToggle.addEventListener("click", () => {
        alertsPanel.classList.toggle("hidden");
        btnToggle.classList.toggle("active", !alertsPanel.classList.contains("hidden"));
    });

    // Populate coin selector from allData whenever data arrives
    function syncAlertCoinOptions() {
        if (!alCoinSel) return;
        const current = alCoinSel.value;
        alCoinSel.innerHTML = "";
        allData.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.name;
            opt.textContent = c.name;
            alCoinSel.appendChild(opt);
        });
        // Restore selection if still available
        if (current && Array.from(alCoinSel.options).some(o => o.value === current)) {
            alCoinSel.value = current;
        }
    }

    // Metric label helpers
    const METRIC_LABELS = { price: "Price", change: "24h Change", cap: "Market Cap" };
    const OP_LABELS     = { gt: ">", gte: "≥", lt: "<", lte: "≤" };

    function alertLabel(a) {
        const metricStr = METRIC_LABELS[a.metric] || a.metric;
        const opStr     = OP_LABELS[a.op] || a.op;
        // Format threshold for display
        let threshStr;
        if (a.metric === "change") {
            threshStr = a.threshold + "%";
        } else if (a.metric === "cap") {
            threshStr = formatCapThreshold(a.threshold);
        } else {
            threshStr = "$" + Number(a.threshold).toLocaleString();
        }
        return `${a.coin} ${metricStr} ${opStr} ${threshStr}`;
    }

    function formatCapThreshold(num) {
        if (num >= 1e12) return "$" + (num / 1e12).toFixed(2).replace(/\.?0+$/, "") + "T";
        if (num >= 1e9)  return "$" + (num / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
        if (num >= 1e6)  return "$" + (num / 1e6).toFixed(2).replace(/\.?0+$/, "") + "M";
        return "$" + Number(num).toLocaleString();
    }

    // Parse the user-entered threshold value (reuses existing parseCap / parseChange)
    function parseAlertThreshold(metric, rawVal) {
        if (metric === "price") {
            // Accept bare number or $-prefixed, with optional commas
            const n = parseCurrency(rawVal);
            return isNaN(n) ? null : n;
        } else if (metric === "change") {
            // Accept "5", "5%", "-2.5%"
            const n = parseChange(rawVal);
            return isNaN(n) ? null : n;
        } else if (metric === "cap") {
            // Accept "$10B", "1.5T", "500M", or plain number
            const n = parseCap(rawVal);
            return isNaN(n) ? null : n;
        }
        return null;
    }

    // Evaluate one alert against a coin row; returns true if condition is met
    function evalAlert(alert, coinRow) {
        let value;
        if (alert.metric === "price") {
            value = parseCurrency(coinRow.price);
        } else if (alert.metric === "change") {
            value = parseChange(coinRow.change_24h);
        } else if (alert.metric === "cap") {
            value = parseCap(coinRow.market_cap);
        } else {
            return false;
        }
        return applyOp(value, alert.op, alert.threshold);
    }

    // Evaluate all alerts against the latest allData snapshot
    function evaluateAlerts() {
        if (alerts.length === 0) return;

        const dataMap = {};
        allData.forEach(c => { dataMap[c.name] = c; });

        alerts.forEach(al => {
            const coinRow = dataMap[al.coin];
            if (!coinRow) return; // Coin not in current data — skip silently

            const conditionMet = evalAlert(al, coinRow);

            if (conditionMet && al.armed) {
                // Transition: false → true — fire the alert!
                al.armed = false;
                showToast(al);
            } else if (!conditionMet && !al.armed) {
                // Condition returned to false — re-arm for next trigger
                al.armed = true;
            }
        });

        renderAlertList();
    }

    // Add a new alert
    alAddBtn.addEventListener("click", () => {
        const coin   = alCoinSel.value;
        const metric = alMetricSel.value;
        const op     = alOpSel.value;
        const rawVal = alValInput.value.trim();

        // Validate
        if (!rawVal) {
            showAlError("Please enter a threshold value.");
            return;
        }
        const threshold = parseAlertThreshold(metric, rawVal);
        if (threshold === null || isNaN(threshold)) {
            showAlError("Invalid value. Enter a number (e.g. 80000, 5%, $10B).");
            return;
        }
        hideAlError();

        const coinRow = allData.find(c => c.name === coin);
        const isCurrentlyMet = coinRow ? evalAlert({metric, op, threshold}, coinRow) : false;

        const al = {
            id: ++alertIdCounter,
            coin,
            metric,
            op,
            threshold,
            armed: !isCurrentlyMet,
            label: ""
        };
        al.label = alertLabel(al);
        alerts.push(al);

        alValInput.value = "";
        renderAlertList();
        updateAlertBadge();
        if (typeof renderPortfolio === 'function') renderPortfolio();
    });

    function showAlError(msg) {
        alError.textContent = msg;
        alError.classList.remove("hidden");
    }
    function hideAlError() {
        alError.classList.add("hidden");
        alError.textContent = "";
    }

    // Remove an alert by id
    function removeAlert(id) {
        alerts = alerts.filter(a => a.id !== id);
        renderAlertList();
        updateAlertBadge();
        if (typeof renderPortfolio === 'function') renderPortfolio();
    }

    // Render the active alerts list
    function renderAlertList() {
        if (!alertList) return;
        if (alerts.length === 0) {
            alertList.innerHTML = '<div class="alert-list-empty">No active alerts.</div>';
            return;
        }

        alertList.innerHTML = alerts.map(al => {
            const statusClass = al.armed ? "armed" : "triggered";
            const statusText  = al.armed ? "Armed" : "Triggered";
            return `
                <div class="alert-item ${al.armed ? '' : 'triggered'}" data-id="${al.id}">
                    <span class="alert-item-label">${al.label}</span>
                    <span class="alert-item-status ${statusClass}">${statusText}</span>
                    <button class="btn-al-remove" data-id="${al.id}" title="Remove alert">&times;</button>
                </div>
            `;
        }).join("");

        // Attach remove listeners
        alertList.querySelectorAll(".btn-al-remove").forEach(btn => {
            btn.addEventListener("click", () => removeAlert(Number(btn.getAttribute("data-id"))));
        });
    }

    function updateAlertBadge() {
        if (!alertBadge) return;
        if (alerts.length === 0) {
            alertBadge.classList.add("hidden");
        } else {
            alertBadge.textContent = alerts.length;
            alertBadge.classList.remove("hidden");
        }
    }

    // Show a toast notification
    function showToast(alOrMsg) {
        const isString = typeof alOrMsg === 'string';
        const msg = isString ? alOrMsg : alOrMsg.label;
        const title = isString ? "Success" : "Alert Triggered";
        
        const toast = document.createElement("div");
        toast.className = "toast";
        toast.innerHTML = `
            <svg class="toast-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-msg">${msg}</div>
            </div>
            <button class="toast-close" title="Dismiss">&times;</button>
        `;

        const closeBtn = toast.querySelector(".toast-close");
        closeBtn.addEventListener("click", () => dismissToast(toast));

        toastContainer.appendChild(toast);

        // Auto-dismiss after 8 seconds
        setTimeout(() => dismissToast(toast), 8000);
    }

    function dismissToast(toast) {
        if (!toast.parentNode) return;
        toast.classList.add("removing");
        toast.addEventListener("animationend", () => toast.remove(), { once: true });
    }

    // Attach to window so onclick works globally
    window.openAlertsFor = function(slug) {
        const alertsPanel = document.getElementById("alerts-panel");
        const btnToggle = document.getElementById("btn-toggle-alerts");
        const alCoinSel = document.getElementById("al-coin");
        if (alertsPanel && alertsPanel.classList.contains("hidden")) {
            alertsPanel.classList.remove("hidden");
            if (btnToggle) btnToggle.classList.add("active");
        }
        if (alCoinSel && typeof allData !== 'undefined') {
            const coin = allData.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === slug);
            if (coin) {
                alCoinSel.value = coin.name;
            }
            alCoinSel.focus();
            alCoinSel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    window.togglePortfolioAlerts = function(slug) {
        const pnl = document.getElementById(`inline-alert-${slug}`);
        if (pnl) {
            pnl.style.display = pnl.style.display === 'none' ? 'block' : 'none';
        }
    };

    window.submitPortfolioAlert = function(slug) {
        const row = document.querySelector(`.portfolio-row[data-slug="${slug}"]`);
        if (!row) return;

        const coinObj = allData.find(c => c.name.toLowerCase().replace(/[^a-z0-9]/g, "") === slug);
        if (!coinObj) return;

        const coin = coinObj.name;
        const metric = row.querySelector('.inline-al-metric').value;
        const op = row.querySelector('.inline-al-op').value;
        const rawVal = row.querySelector('.inline-al-val').value.trim();
        const errorDiv = row.querySelector('.inline-al-error');

        if (!rawVal) {
            errorDiv.textContent = "Please enter a threshold value.";
            errorDiv.classList.remove('hidden');
            return;
        }
        const threshold = parseAlertThreshold(metric, rawVal);
        if (threshold === null || isNaN(threshold)) {
            errorDiv.textContent = "Invalid value. Enter a number (e.g. 80000, 5%, $10B).";
            errorDiv.classList.remove('hidden');
            return;
        }
        errorDiv.classList.add('hidden');

        const coinRow = allData.find(c => c.name === coin);
        const isCurrentlyMet = coinRow ? evalAlert({metric, op, threshold}, coinRow) : false;

        const al = {
            id: ++alertIdCounter,
            coin: coin,
            metric: metric,
            op: op,
            threshold: threshold,
            armed: !isCurrentlyMet,
            label: ""
        };
        al.label = alertLabel(al);

        alerts.push(al);
        renderAlertList();
        evaluateAlerts();

        // Show toast confirmation
        showToast(`Alert added: ${al.label}`);
        
        // Clear input
        row.querySelector('.inline-al-val').value = '';
        
        // Auto-close inline panel
        togglePortfolioAlerts(slug);
    };

    window.toggleWatchlist = toggleWatchlist;

});
