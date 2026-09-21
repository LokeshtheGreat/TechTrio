def get_portfolio():
    """
    Returns a mock portfolio dictionary.
    Keys are cryptocurrency names, values are quantities.
    """
    return {
        "Bitcoin": 0.05,
        "Ethereum": 0.50,
        "Solana": 10.0
    }

def calculate_portfolio_value(latest_data):
    """
    Calculates the total value of the portfolio based on latest scraped data.
    """
    portfolio = get_portfolio()
    total_value = 0.0
    
    # Create a quick lookup for prices
    price_lookup = {}
    for coin in latest_data:
        name = coin.get("name")
        price_str = coin.get("price", "0")
        # Clean price
        price_clean = float(price_str.replace("$", "").replace(",", "").strip())
        price_lookup[name] = price_clean
        
    for coin_name, qty in portfolio.items():
        if coin_name in price_lookup:
            total_value += qty * price_lookup[coin_name]
            
    return total_value

