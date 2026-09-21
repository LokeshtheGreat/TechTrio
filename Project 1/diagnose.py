import pandas as pd

df = pd.read_csv('data/crypto_prices.csv').dropna(subset=['timestamp'])
df['_dt'] = pd.to_datetime(df['timestamp'], format='mixed', dayfirst=False, errors='coerce')
df = df.dropna(subset=['_dt'])

def clean_price(val):
    if isinstance(val, str):
        val = val.replace('$','').replace(',','').strip()
        try: return float(val)
        except: return None
    return float(val)

for coin in ['Tether', 'Bitcoin']:
    cdf = df[df['name'] == coin].copy()
    cdf['price_f'] = cdf['price'].apply(clean_price)
    cdf = cdf.dropna(subset=['price_f'])
    price_range = cdf['price_f'].max() - cdf['price_f'].min()
    print('--- ' + coin + ' ---')
    print('  Observations: ' + str(len(cdf)))
    print('  Price min:    ' + str(round(cdf['price_f'].min(), 6)))
    print('  Price max:    ' + str(round(cdf['price_f'].max(), 6)))
    print('  Price mean:   ' + str(round(cdf['price_f'].mean(), 6)))
    print('  Price range:  ' + str(round(price_range, 6)))
    print('  Time span:    ' + str(cdf['_dt'].min()) + ' to ' + str(cdf['_dt'].max()))
    # Show a sample of raw price strings
    print('  Sample prices: ' + str(cdf['price'].head(5).tolist()))
    print()
