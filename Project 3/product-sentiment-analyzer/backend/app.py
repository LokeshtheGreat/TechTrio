from flask import Flask, jsonify

from routes.product_routes import product_bp


app = Flask(__name__)

# Register product routes
app.register_blueprint(product_bp, url_prefix="/api/products")


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "success": True,
        "message": "Product Sentiment Analyzer API is running."
    })


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False
    )