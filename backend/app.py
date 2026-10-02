from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from config import Config, FRONTEND_DIR
from database import db
from models import InventoryManager

# Flask serves the frontend too, so one local process is the whole app
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
app.config.from_object(Config)

# Initialize extensions
db.init_app(app)
CORS(app)
inventory_manager = InventoryManager(app)

# API Routes


@app.route('/')
def home():
    return send_from_directory(FRONTEND_DIR, 'index.html')


@app.route('/api/products', methods=['GET'])
def get_products():
    """Get all products with pagination and sorting"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sort_by = request.args.get('sort_by', 'name')
        sort_order = request.args.get('sort_order', 'asc')

        # Validate pagination parameters
        if page < 1:
            return jsonify({"success": False, "error": "Page must be greater than 0"}), 400

        # Clamp per_page to valid range
        per_page = max(1, min(100, per_page))

        # Validate sort parameters
        valid_sort_fields = ['name', 'category', 'price', 'quantity', 'total_sold']
        if sort_by not in valid_sort_fields:
            sort_by = 'name'

        if sort_order not in ['asc', 'desc']:
            sort_order = 'asc'

        products_data = inventory_manager.get_paginated_products(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order
        )

        return jsonify({
            "success": True,
            "data": {
                "products": [product.to_dict() for product in products_data['items']],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": products_data['total'],
                    "pages": products_data['pages'],
                    "has_next": products_data['has_next'],
                    "has_prev": products_data['has_prev']
                },
                "sorting": {
                    "sort_by": sort_by,
                    "sort_order": sort_order
                }
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/products/<product_id>', methods=['GET'])
def get_product(product_id):
    """Get a specific product"""
    try:
        product = inventory_manager.get_product(product_id)
        if product:
            return jsonify({"success": True, "data": product.to_dict()})
        return jsonify({"success": False, "error": "Product not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/products', methods=['POST'])
def add_product():
    """Add a new product"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "No JSON data provided"}), 400

        required_fields = ['name', 'category', 'price', 'quantity']
        if not all(field in data for field in required_fields):
            return jsonify({"success": False, "error": "Missing required fields"}), 400

        success, result = inventory_manager.add_product(
            name=data['name'],
            category=data['category'],
            price=float(data['price']),
            quantity=int(data['quantity']),
            reorder_level=int(data.get('reorder_level', 5)),
            product_id=data.get('product_id')
        )

        if success:
            return jsonify({
                "success": True,
                "message": "Product added successfully",
                "product_id": result
            }), 201
        else:
            return jsonify({"success": False, "error": result}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/products/<product_id>/stock', methods=['PUT'])
def update_stock(product_id):
    """Update product stock"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({"success": False, "error": "No JSON data provided"}), 400

        if 'quantity_change' not in data:
            return jsonify({"success": False, "error": "Quantity change required"}), 400

        product, message = inventory_manager.update_stock(
            product_id,
            int(data['quantity_change'])
        )

        if product:
            return jsonify({
                "success": True,
                "message": message,
                "data": product.to_dict()
            })
        else:
            return jsonify({"success": False, "error": message}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/products/<product_id>', methods=['DELETE'])
def delete_product(product_id):
    """Delete a product"""
    try:
        success, message = inventory_manager.delete_product(product_id)

        if success:
            return jsonify({"success": True, "message": message})
        else:
            return jsonify({"success": False, "error": message}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/products/search', methods=['GET'])
def search_products():
    """Search products with pagination and sorting"""
    try:
        search_term = request.args.get('q', '')
        search_by = request.args.get('by', 'name')
        sort_by = request.args.get('sort_by', 'name')
        sort_order = request.args.get('sort_order', 'asc')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        if not search_term:
            return jsonify({"success": False, "error": "Search term required"}), 400

        # Validate pagination parameters
        if page < 1:
            return jsonify({"success": False, "error": "Page must be greater than 0"}), 400

        # Clamp per_page to valid range
        per_page = max(1, min(100, per_page))

        # Validate sort parameters
        valid_sort_fields = ['name', 'category', 'price', 'quantity']
        if sort_by not in valid_sort_fields:
            sort_by = 'name'

        if sort_order not in ['asc', 'desc']:
            sort_order = 'asc'

        search_data = inventory_manager.search_products_paginated(
            search_term=search_term,
            search_by=search_by,
            sort_by=sort_by,
            sort_order=sort_order,
            page=page,
            per_page=per_page
        )

        return jsonify({
            "success": True,
            "data": {
                "products": [product.to_dict() for product in search_data['items']],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": search_data['total'],
                    "pages": search_data['pages'],
                    "has_next": search_data['has_next'],
                    "has_prev": search_data['has_prev'],
                    "search_term": search_term,
                    "search_by": search_by
                },
                "sorting": {
                    "sort_by": sort_by,
                    "sort_order": sort_order
                }
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analytics/dashboard', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        metrics = inventory_manager.get_performance_metrics()
        top_sellers = inventory_manager.get_top_selling_products(5)

        return jsonify({
            "success": True,
            "data": {
                "total_products": metrics['total_products'],
                "inventory_value": metrics['inventory_value'],
                "total_sold": metrics['total_sold'],
                "sales_revenue": metrics['sales_revenue'],
                "low_stock_count": metrics['low_stock_count'],
                "sales_growth": metrics['sales_growth'],
                "recent_sales": metrics['recent_sales'],
                "top_sellers": [product.to_dict() for product in top_sellers]
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analytics/low-stock', methods=['GET'])
def get_low_stock():
    """Get low stock products with pagination and sorting"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        sort_by = request.args.get('sort_by', 'quantity')
        sort_order = request.args.get('sort_order', 'asc')

        # Validate pagination parameters
        if page < 1:
            return jsonify({"success": False, "error": "Page must be greater than 0"}), 400

        # Clamp per_page to valid range
        per_page = max(1, min(100, per_page))

        # Validate sort parameters
        valid_sort_fields = ['name', 'category', 'quantity', 'price']
        if sort_by not in valid_sort_fields:
            sort_by = 'quantity'

        if sort_order not in ['asc', 'desc']:
            sort_order = 'asc'

        low_stock_data = inventory_manager.get_low_stock_products_paginated(
            page=page,
            per_page=per_page,
            sort_by=sort_by,
            sort_order=sort_order
        )

        return jsonify({
            "success": True,
            "data": {
                "products": [product.to_dict() for product in low_stock_data['items']],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": low_stock_data['total'],
                    "pages": low_stock_data['pages'],
                    "has_next": low_stock_data['has_next'],
                    "has_prev": low_stock_data['has_prev']
                },
                "sorting": {
                    "sort_by": sort_by,
                    "sort_order": sort_order
                }
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analytics/sales-history', methods=['GET'])
def get_sales_history():
    """Get sales history with pagination"""
    try:
        days = request.args.get('days', 30, type=int)
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        # Validate pagination parameters
        if page < 1:
            return jsonify({"success": False, "error": "Page must be greater than 0"}), 400

        # Clamp per_page to valid range
        per_page = max(1, min(100, per_page))

        sales_data = inventory_manager.get_sales_history_paginated(
            days=days,
            page=page,
            per_page=per_page
        )

        return jsonify({
            "success": True,
            "data": {
                "sales": sales_data['items'],
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total": sales_data['total'],
                    "pages": sales_data['pages'],
                    "has_next": sales_data['has_next'],
                    "has_prev": sales_data['has_prev']
                }
            }
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# New Analytics Endpoints for Real-time Charts
@app.route('/api/analytics/category-stats', methods=['GET'])
def get_category_stats():
    """Get category statistics for charts"""
    try:
        category_stats = inventory_manager.get_category_stats()
        return jsonify({
            "success": True,
            "data": category_stats
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analytics/daily-sales', methods=['GET'])
def get_daily_sales():
    """Get daily sales data for trend charts"""
    try:
        days = request.args.get('days', 30, type=int)
        daily_sales = inventory_manager.get_daily_sales_data(days=days)
        return jsonify({
            "success": True,
            "data": daily_sales
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analytics/stock-distribution', methods=['GET'])
def get_stock_distribution():
    """Get stock distribution data"""
    try:
        stock_dist = inventory_manager.get_stock_distribution()
        return jsonify({
            "success": True,
            "data": stock_dist
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/analytics/top-products-revenue', methods=['GET'])
def get_top_products_revenue():
    """Get top products by revenue"""
    try:
        limit = request.args.get('limit', 10, type=int)
        top_products = inventory_manager.get_top_products_by_revenue(limit=limit)
        return jsonify({
            "success": True,
            "data": top_products
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/analytics/performance-metrics', methods=['GET'])
def get_performance_metrics():
    """Get performance metrics"""
    try:
        metrics = inventory_manager.get_performance_metrics()
        return jsonify({
            "success": True,
            "data": metrics
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"success": True, "status": "healthy", "message": "Inventory API is running"})

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({"success": False, "error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"success": False, "error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
