import matplotlib
matplotlib.use("Agg") # Non-interactive backend
import matplotlib.pyplot as plt
import pandas as pd
import os

CSV_FILE = "data/crypto_prices.csv"
IMAGES_DIR = "static/images"

def _clean_currency(val):
    if isinstance(val, str):
        val = val.replace("$", "").replace(",", "").strip()
        try: return float(val)
        except ValueError: return 0.0
    return float(val)

def _clean_percentage(val):
    if isinstance(val, str):
        val = val.replace("%", "").strip()
        try: return float(val)
        except ValueError: return 0.0
    return float(val)

def style_axes(ax):
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.spines["left"].set_color("#e5e7eb")
    ax.spines["bottom"].set_color("#e5e7eb")
    ax.tick_params(axis="x", colors="#6b7280")
    ax.tick_params(axis="y", colors="#6b7280")

def generate_visualizations():
    if not os.path.isfile(CSV_FILE):
        return
        
    df = pd.read_csv(CSV_FILE).dropna(subset=["timestamp"])
    if df.empty:
        return
        
    if not os.path.exists(IMAGES_DIR):
        os.makedirs(IMAGES_DIR)

    # Use datetime-aware latest_time selection to avoid mixed-format string-sort issues
    df["_dt"] = pd.to_datetime(df["timestamp"], format="mixed", dayfirst=False, errors="coerce")
    latest_time = df.loc[df["_dt"].idxmax(), "timestamp"]

    # Get the latest top 10 coins
    top_10_coins = df[df["timestamp"] == latest_time].sort_values("rank").head(10)["name"].tolist()

    # 1. Price History (Individual charts for Top 10)
    import matplotlib.dates as mdates
    import matplotlib.ticker as mticker
    
    for coin in top_10_coins:
        fig, ax = plt.subplots(figsize=(10, 4))
        coin_df = df[df["name"] == coin].copy()
        
        if not coin_df.empty:
            coin_df["parsed_time"] = pd.to_datetime(coin_df["timestamp"], format="mixed", errors="coerce")
            coin_df = coin_df.dropna(subset=["parsed_time"])
            coin_df["clean_price"] = coin_df["price"].apply(_clean_currency)
            # Ensure chronological order — do NOT interpolate or add artificial points
            coin_df = coin_df.sort_values("parsed_time")
            
            prices = coin_df["clean_price"]
            price_min = prices.min()
            price_max = prices.max()
            price_range = price_max - price_min
            
            # Plot actual observations with visible markers
            ax.plot(coin_df["parsed_time"], prices,
                    marker="o", markersize=3, linewidth=1.5,
                    color="#2563eb", markerfacecolor="#2563eb", markeredgewidth=0)
            
            # --- Sensible Y-axis padding based on relative price range ---
            if price_range == 0:
                # Completely flat: add a tiny absolute pad so the line isn't cut off
                pad = price_min * 0.001 if price_min > 0 else 0.001
                ax.set_ylim(price_min - pad, price_max + pad)
            elif price_min > 0 and (price_range / price_min) < 0.005:
                # Stablecoin / very narrow range (< 0.5% swing):
                # Pad by 50% of actual range — keeps moves readable without distorting scale
                pad = price_range * 0.5
                ax.set_ylim(price_min - pad, price_max + pad)
            else:
                # Normal volatile coin: 5% padding on each side
                pad = price_range * 0.05
                ax.set_ylim(price_min - pad, price_max + pad)
            
            # --- Y-axis decimal precision based on price magnitude ---
            if price_max < 0.01:
                ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("$%.6f"))
            elif price_max < 1.5:
                # Stablecoins: 4 decimal places so real micro-movements show
                ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("$%.4f"))
            elif price_max < 10:
                ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("$%.3f"))
            elif price_max < 1000:
                ax.yaxis.set_major_formatter(mticker.FormatStrFormatter("$%.2f"))
            else:
                # Large prices (BTC etc): comma-formatted integers
                ax.yaxis.set_major_formatter(mticker.FuncFormatter(
                    lambda x, _: f"${x:,.0f}"
                ))

        style_axes(ax)
        ax.yaxis.grid(True, linestyle="--", alpha=0.5, color="#e5e7eb")
        
        # X-axis: show HH:MM timestamps from actual data
        ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M'))
        plt.xticks(rotation=45, ha='right', color="#6b7280", fontsize=9)
        
        ax.set_ylabel("Price", color="#6b7280", fontsize=10)
        
        plt.tight_layout()
        safe_coin_name = "".join([c for c in coin if c.isalpha() or c.isdigit()]).lower()
        plt.savefig(os.path.join(IMAGES_DIR, f"price_history_{safe_coin_name}.png"), dpi=120, transparent=True)
        plt.close(fig)

    # 2. 24h Change Comparison (Latest Top 10)
    fig, ax = plt.subplots(figsize=(10, 6.5)) # Taller chart for readability
    latest_df = df[df["timestamp"] == latest_time].copy()
    latest_df["clean_change"] = latest_df["change_24h"].apply(_clean_percentage)
    
    # Sort by change
    latest_df = latest_df.sort_values("clean_change", ascending=True)
    
    colors = ["#22c55e" if x >= 0 else "#ef4444" for x in latest_df["clean_change"]]
    
    bars = ax.barh(latest_df["name"], latest_df["clean_change"], color=colors, height=0.6)
    style_axes(ax)
    ax.xaxis.grid(True, linestyle="--", alpha=0.5, color="#e5e7eb")
    ax.axvline(0, color="#d1d5db", linewidth=1.5)
    
    # Add percentage labels next to bars for clarity
    min_val = latest_df["clean_change"].min()
    max_val = latest_df["clean_change"].max()
    max_abs_val = max(abs(min_val), abs(max_val))
    
    # Calculate a proportional text padding so labels don't get cut off
    # Minimum 0.5 absolute so small ranges don't clip text
    text_pad = max(max_abs_val * 0.05, 0.5) 
    
    # Explicitly extend the X-axis limits to give room for the text labels
    # We add ~25% padding on both sides specifically for the text
    axis_pad = max(max_abs_val * 0.25, 1.0)
    ax.set_xlim(min_val - axis_pad, max_val + axis_pad)
    
    for bar in bars:
        width = bar.get_width()
        label_x_pos = width + text_pad if width >= 0 else width - text_pad
        ha = "left" if width >= 0 else "right"
        
        # If the value is very close to zero, force it to display on the right to avoid overlapping the y-axis
        if abs(width) < 0.01:
            label_x_pos = text_pad
            ha = "left"
            
        ax.text(label_x_pos, bar.get_y() + bar.get_height()/2, f"{width:+.2f}%", 
                va="center", ha=ha, fontsize=10, fontweight="bold", color="#4b5563")
        
    ax.set_xlabel("24h Change (%)", color="#6b7280", fontsize=11, fontweight="bold")
    ax.tick_params(axis='y', labelsize=11)
    
    # Ensure enough space for coin names on the left
    plt.subplots_adjust(left=0.20, right=0.95, top=0.95, bottom=0.15)
    
    plt.savefig(os.path.join(IMAGES_DIR, "change_chart.png"), dpi=120, transparent=True)
    plt.close(fig)

if __name__ == "__main__":
    generate_visualizations()

