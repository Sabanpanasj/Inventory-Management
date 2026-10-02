import re
from database import db, Product, SalesHistory
from datetime import datetime, timedelta
from math import ceil
from sqlalchemy import desc, asc, func


class InventoryManager:
    def __init__(self, app=None):
        if app:
            self.init_app(app)

    def init_app(self, app):
        with app.app_context():
            db.create_all()

    def generate_product_id(self, category):
        """Generate a unique product ID based on category"""
        category_clean = re.sub(r'[^a-zA-Z0-9]', '', category.upper())[:3]
        if not category_clean:
            category_clean = "GEN"

        # Find existing IDs with same prefix
        existing_products = Product.query.filter(Product.id.like(f'{category_clean}%')).all()
        existing_numbers = []

        for product in existing_products:
            match = re.match(rf'^{category_clean}(\d+)$', product.id)
            if match:
                existing_numbers.append(int(match.group(1)))

        next_number = max(existing_numbers) + 1 if existing_numbers else 1
        return f"{category_clean}{next_number:03d}"

    def add_product(self, name, category, price, quantity, reorder_level=5, product_id=None):
        """Add a new product to inventory"""
        if product_id and Product.query.get(product_id):
            return False, "Product ID already exists"

        if not product_id:
            product_id = self.generate_product_id(category)

        product = Product(
            id=product_id,
            name=name,
            category=category,
            price=price,
            quantity=quantity,
            reorder_level=reorder_level,
            last_updated=datetime.utcnow()
        )

        try:
            db.session.add(product)
            db.session.commit()
            return True, product_id
        except Exception as e:
            db.session.rollback()
            return False, str(e)

    def update_stock(self, product_id, quantity_change):
        """Update product stock quantity"""
        product = Product.query.get(product_id)
        if not product:
            return None, "Product not found"

        new_quantity = product.quantity + quantity_change
        if new_quantity < 0:
            return None, "Insufficient stock"

        # Track sales
        if quantity_change < 0:
            product.total_sold += abs(quantity_change)
            # Record sale in history
            sale = SalesHistory(
                product_id=product_id,
                quantity_sold=abs(quantity_change),
                sale_price=product.price
            )
            db.session.add(sale)

        product.quantity = new_quantity
        product.last_updated = datetime.utcnow()

        try:
            db.session.commit()
            return product, "Stock updated successfully"
        except Exception as e:
            db.session.rollback()
            return None, str(e)

    def delete_product(self, product_id):
        """Delete a product from inventory"""
        product = Product.query.get(product_id)
        if not product:
            return False, "Product not found"

        try:
            # Delete associated sales history first
            SalesHistory.query.filter_by(product_id=product_id).delete()
            db.session.delete(product)
            db.session.commit()
            return True, "Product deleted successfully"
        except Exception as e:
            db.session.rollback()
            return False, str(e)

    def get_low_stock_products(self):
        """Get products with low stock"""
        return Product.query.filter(Product.quantity <= Product.reorder_level).all()

    def get_low_stock_products_paginated(self, page=1, per_page=10, sort_by='name', sort_order='asc'):
        """Get low stock products with pagination and sorting"""
        query = Product.query.filter(Product.quantity <= Product.reorder_level)

        # Apply sorting
        if sort_by == 'name':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.name))
            else:
                query = query.order_by(asc(Product.name))
        elif sort_by == 'category':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.category))
            else:
                query = query.order_by(asc(Product.category))
        elif sort_by == 'quantity':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.quantity))
            else:
                query = query.order_by(asc(Product.quantity))
        elif sort_by == 'price':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.price))
            else:
                query = query.order_by(asc(Product.price))
        else:
            # Default sorting by quantity ascending (most critical first)
            query = query.order_by(asc(Product.quantity))

        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        pages = ceil(total / per_page) if per_page > 0 else 1

        return {
            'items': items,
            'total': total,
            'pages': pages,
            'has_next': page < pages,
            'has_prev': page > 1
        }

    def get_all_products(self):
        """Get all products"""
        return Product.query.all()

    def get_paginated_products(self, page=1, per_page=10, sort_by='name', sort_order='asc'):
        """Get products with pagination and sorting"""
        query = Product.query

        # Apply sorting
        if sort_by == 'name':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.name))
            else:
                query = query.order_by(asc(Product.name))
        elif sort_by == 'category':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.category))
            else:
                query = query.order_by(asc(Product.category))
        elif sort_by == 'price':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.price))
            else:
                query = query.order_by(asc(Product.price))
        elif sort_by == 'quantity':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.quantity))
            else:
                query = query.order_by(asc(Product.quantity))
        elif sort_by == 'total_sold':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.total_sold))
            else:
                query = query.order_by(asc(Product.total_sold))
        else:
            # Default sorting by name ascending
            query = query.order_by(asc(Product.name))

        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        pages = ceil(total / per_page) if per_page > 0 else 1

        return {
            'items': items,
            'total': total,
            'pages': pages,
            'has_next': page < pages,
            'has_prev': page > 1
        }

    def get_product(self, product_id):
        """Get a specific product"""
        return Product.query.get(product_id)

    def search_products(self, search_term, search_by="name", sort_by='name', sort_order='asc'):
        """Search products by name, category, or ID with sorting"""
        search_term = f"%{search_term}%"

        if search_by == "name":
            query = Product.query.filter(Product.name.ilike(search_term))
        elif search_by == "category":
            query = Product.query.filter(Product.category.ilike(search_term))
        elif search_by == "id":
            query = Product.query.filter(Product.id.ilike(search_term))
        else:
            query = Product.query.filter(Product.name.ilike(search_term))

        # Apply sorting
        if sort_by == 'name':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.name))
            else:
                query = query.order_by(asc(Product.name))
        elif sort_by == 'category':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.category))
            else:
                query = query.order_by(asc(Product.category))
        elif sort_by == 'price':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.price))
            else:
                query = query.order_by(asc(Product.price))
        elif sort_by == 'quantity':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.quantity))
            else:
                query = query.order_by(asc(Product.quantity))
        else:
            query = query.order_by(asc(Product.name))

        return query.all()

    def search_products_paginated(self, search_term, search_by="name", sort_by='name', sort_order='asc', page=1, per_page=10):
        """Search products with pagination and sorting"""
        search_term = f"%{search_term}%"

        if search_by == "name":
            query = Product.query.filter(Product.name.ilike(search_term))
        elif search_by == "category":
            query = Product.query.filter(Product.category.ilike(search_term))
        elif search_by == "id":
            query = Product.query.filter(Product.id.ilike(search_term))
        else:
            query = Product.query.filter(Product.name.ilike(search_term))

        # Apply sorting
        if sort_by == 'name':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.name))
            else:
                query = query.order_by(asc(Product.name))
        elif sort_by == 'category':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.category))
            else:
                query = query.order_by(asc(Product.category))
        elif sort_by == 'price':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.price))
            else:
                query = query.order_by(asc(Product.price))
        elif sort_by == 'quantity':
            if sort_order == 'desc':
                query = query.order_by(desc(Product.quantity))
            else:
                query = query.order_by(asc(Product.quantity))
        else:
            query = query.order_by(asc(Product.name))

        total = query.count()
        items = query.offset((page - 1) * per_page).limit(per_page).all()
        pages = ceil(total / per_page) if per_page > 0 else 1

        return {
            'items': items,
            'total': total,
            'pages': pages,
            'has_next': page < pages,
            'has_prev': page > 1
        }

    def get_inventory_value(self):
        """Calculate total inventory value"""
        products = Product.query.all()
        return sum(product.quantity * product.price for product in products)

    def get_total_sold(self):
        """Calculate total items sold"""
        return db.session.query(db.func.sum(Product.total_sold)).scalar() or 0

    def get_sales_revenue(self):
        """Calculate total sales revenue"""
        products = Product.query.all()
        return sum(product.total_sold * product.price for product in products)

    def get_top_selling_products(self, limit=5):
        """Get top selling products"""
        return Product.query.order_by(desc(Product.total_sold)).limit(limit).all()

    def get_sales_history(self, days=30):
        """Get sales history for specified days"""
        start_date = datetime.utcnow() - timedelta(days=days)
        return SalesHistory.query.filter(SalesHistory.sale_date >= start_date).all()

    def get_sales_history_paginated(self, days=30, page=1, per_page=10):
        """Get sales history with pagination"""
        start_date = datetime.utcnow() - timedelta(days=days)

        query = SalesHistory.query.filter(SalesHistory.sale_date >= start_date)

        total = query.count()
        items = query.order_by(desc(SalesHistory.sale_date)).offset(
            (page - 1) * per_page).limit(per_page).all()
        pages = ceil(total / per_page) if per_page > 0 else 1

        # Convert to dict format
        sales_data = []
        for sale in items:
            sales_data.append({
                'id': sale.id,
                'product_id': sale.product_id,
                'product_name': sale.product.name,
                'quantity_sold': sale.quantity_sold,
                'sale_price': sale.sale_price,
                'total_amount': sale.quantity_sold * sale.sale_price,
                'sale_date': sale.sale_date.isoformat()
            })

        return {
            'items': sales_data,
            'total': total,
            'pages': pages,
            'has_next': page < pages,
            'has_prev': page > 1
        }

    # New Analytics Methods for Real-time Charts
    def get_category_stats(self):
        """Get statistics by category for charts"""
        categories = db.session.query(
            Product.category,
            func.count(Product.id).label('product_count'),
            func.sum(Product.quantity * Product.price).label('total_value'),
            func.sum(Product.quantity).label('total_quantity'),
            func.sum(Product.total_sold).label('total_sold')
        ).group_by(Product.category).all()

        return [
            {
                'category': cat.category,
                'product_count': cat.product_count,
                'total_value': float(cat.total_value or 0),
                'total_quantity': cat.total_quantity or 0,
                'total_sold': cat.total_sold or 0
            }
            for cat in categories
        ]

    def get_daily_sales_data(self, days=30):
        """Get daily sales data for trend charts - FIXED VERSION"""
        start_date = datetime.utcnow() - timedelta(days=days)
        end_date = datetime.utcnow()

        # Get all sales in the date range
        sales = SalesHistory.query.filter(
            SalesHistory.sale_date >= start_date,
            SalesHistory.sale_date <= end_date
        ).all()

        # Group by date
        sales_by_date = {}
        for sale in sales:
            sale_date = sale.sale_date.date().isoformat()
            if sale_date not in sales_by_date:
                sales_by_date[sale_date] = {'units_sold': 0, 'revenue': 0.0}

            sales_by_date[sale_date]['units_sold'] += sale.quantity_sold
            sales_by_date[sale_date]['revenue'] += sale.quantity_sold * sale.sale_price

        # Generate complete date range
        date_range = []
        current_date = start_date.date()

        while current_date <= end_date.date():
            date_range.append(current_date.isoformat())
            current_date += timedelta(days=1)

        # Build result with all dates
        result = []
        for date in date_range:
            if date in sales_by_date:
                result.append({
                    'date': date,
                    'units_sold': sales_by_date[date]['units_sold'],
                    'revenue': sales_by_date[date]['revenue']
                })
            else:
                result.append({
                    'date': date,
                    'units_sold': 0,
                    'revenue': 0.0
                })

        return result

    def get_stock_distribution(self):
        """Get stock distribution data"""
        total_products = Product.query.count()

        out_of_stock = Product.query.filter(Product.quantity == 0).count()
        low_stock = Product.query.filter(
            Product.quantity > 0,
            Product.quantity <= Product.reorder_level
        ).count()
        in_stock = Product.query.filter(Product.quantity > Product.reorder_level).count()

        return {
            'out_of_stock': out_of_stock,
            'low_stock': low_stock,
            'in_stock': in_stock,
            'total_products': total_products
        }

    def get_top_products_by_revenue(self, limit=10):
        """Get top products by revenue"""
        products = Product.query.filter(Product.total_sold > 0).all()

        products_with_revenue = []
        for product in products:
            revenue = product.total_sold * product.price
            products_with_revenue.append({
                'id': product.id,
                'name': product.name,
                'total_sold': product.total_sold,
                'price': product.price,
                'revenue': revenue
            })

        # Sort by revenue descending and take top N
        products_with_revenue.sort(key=lambda x: x['revenue'], reverse=True)
        return products_with_revenue[:limit]

    def get_performance_metrics(self):
        """Get performance metrics for dashboard"""
        total_products = Product.query.count()
        inventory_value = self.get_inventory_value()
        total_sold = self.get_total_sold()
        sales_revenue = self.get_sales_revenue()
        low_stock_count = Product.query.filter(Product.quantity <= Product.reorder_level).count()

        # Calculate sales growth (last 7 days vs previous 7 days)
        end_date = datetime.utcnow()
        start_date_7 = end_date - timedelta(days=7)
        start_date_14 = end_date - timedelta(days=14)

        recent_sales = db.session.query(func.sum(SalesHistory.quantity_sold)).filter(
            SalesHistory.sale_date >= start_date_7
        ).scalar() or 0

        previous_sales = db.session.query(func.sum(SalesHistory.quantity_sold)).filter(
            SalesHistory.sale_date >= start_date_14,
            SalesHistory.sale_date < start_date_7
        ).scalar() or 0

        sales_growth = 0
        if previous_sales > 0:
            sales_growth = ((recent_sales - previous_sales) / previous_sales) * 100

        return {
            'total_products': total_products,
            'inventory_value': inventory_value,
            'total_sold': total_sold,
            'sales_revenue': sales_revenue,
            'low_stock_count': low_stock_count,
            'sales_growth': sales_growth,
            'recent_sales': recent_sales
        }
