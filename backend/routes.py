from flask import jsonify, request, send_from_directory

from auth import login_user, token_required
from config import FRONTEND_DIR
from models import Category, Comment, Recipe, User, db


def register_routes(app):
    @app.route('/')
    def index():
        return send_from_directory(FRONTEND_DIR, 'index.html')

    @app.route('/<path:path>')
    def static_files(path):
        full = FRONTEND_DIR + '/' + path
        if path and __import__('os').path.exists(full):
            return send_from_directory(FRONTEND_DIR, path)
        return send_from_directory(FRONTEND_DIR, 'index.html')

    @app.route('/api/login', methods=['POST'])
    def login():
        data = request.get_json(silent=True) or {}
        token = login_user(data.get('username', ''), data.get('password', ''))
        if not token:
            return jsonify({'message': 'Hibás felhasználónév vagy jelszó.'}), 401
        user = User.query.filter_by(username=data.get('username', '')).first()
        return jsonify({'token': token, 'username': user.username})

    @app.route('/api/register', methods=['POST'])
    def register():
        return jsonify({'message': 'A regisztráció le van tiltva. Használja az admin/admin kombinációt.'}), 403

    @app.route('/api/categories', methods=['GET'])
    def list_categories():
        return jsonify([{'id': c.id, 'name': c.name, 'description': c.description, 'recipe_count': len(c.recipes)} for c in Category.query.all()])

    @app.route('/api/categories', methods=['POST'])
    @token_required
    def create_category():
        data = request.get_json(silent=True) or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'message': 'A név kötelező.'}), 400
        category = Category(name=name, description=(data.get('description') or '').strip())
        db.session.add(category)
        db.session.commit()
        return jsonify({'id': category.id, 'name': category.name, 'description': category.description, 'recipe_count': 0}), 201

    @app.route('/api/categories/<int:id>', methods=['PUT'])
    @token_required
    def update_category(id):
        category = Category.query.get_or_404(id)
        data = request.get_json(silent=True) or {}
        category.name = (data.get('name') or category.name).strip()
        category.description = (data.get('description') or '').strip()
        db.session.commit()
        return jsonify({'id': category.id, 'name': category.name, 'description': category.description, 'recipe_count': len(category.recipes)})

    @app.route('/api/categories/<int:id>', methods=['DELETE'])
    @token_required
    def delete_category(id):
        category = Category.query.get_or_404(id)
        db.session.delete(category)
        db.session.commit()
        return jsonify({'message': 'Törölve.'})

    @app.route('/api/recipes', methods=['GET'])
    def list_recipes():
        return jsonify([{
            'id': r.id,
            'title': r.title,
            'ingredients': r.ingredients,
            'instructions': r.instructions,
            'prep_time': r.prep_time,
            'category_id': r.category_id,
            'category_name': r.category.name if r.category else 'Nincs kategória',
            'comments': [{
                'id': c.id,
                'author': c.author,
                'content': c.content,
                'created_at': c.created_at.isoformat()
            } for c in r.comments]
        } for r in Recipe.query.all()])

    @app.route('/api/recipes', methods=['POST'])
    @token_required
    def create_recipe():
        data = request.get_json(silent=True) or {}
        category = Category.query.get(data.get('category_id'))
        if not category:
            return jsonify({'message': 'Érvénytelen kategória.'}), 400
        recipe = Recipe(title=(data.get('title') or '').strip(), ingredients=(data.get('ingredients') or '').strip(), instructions=(data.get('instructions') or '').strip(), prep_time=int(data.get('prep_time') or 15), category_id=category.id)
        db.session.add(recipe)
        db.session.commit()
        return jsonify({'id': recipe.id, 'title': recipe.title}), 201

    @app.route('/api/recipes/<int:id>', methods=['PUT'])
    @token_required
    def update_recipe(id):
        recipe = Recipe.query.get_or_404(id)
        data = request.get_json(silent=True) or {}
        recipe.title = (data.get('title') or recipe.title).strip()
        recipe.ingredients = (data.get('ingredients') or recipe.ingredients).strip()
        recipe.instructions = (data.get('instructions') or recipe.instructions).strip()
        recipe.prep_time = int(data.get('prep_time') or recipe.prep_time)
        recipe.category_id = int(data.get('category_id') or recipe.category_id)
        db.session.commit()
        return jsonify({'id': recipe.id, 'title': recipe.title})

    @app.route('/api/recipes/<int:id>', methods=['DELETE'])
    @token_required
    def delete_recipe(id):
        recipe = Recipe.query.get_or_404(id)
        db.session.delete(recipe)
        db.session.commit()
        return jsonify({'message': 'Törölve.'})

    @app.route('/api/recipes/<int:id>/comments', methods=['POST'])
    def add_comment(id):
        recipe = Recipe.query.get_or_404(id)
        data = request.get_json(silent=True) or {}
        author = (data.get('author') or 'Vendég').strip() or 'Vendég'
        content = (data.get('content') or '').strip()
        if not content:
            return jsonify({'message': 'A vélemény szövege kötelező.'}), 400
        comment = Comment(author=author, content=content, recipe_id=recipe.id)
        db.session.add(comment)
        db.session.commit()
        return jsonify({'id': comment.id, 'author': comment.author, 'content': comment.content, 'created_at': comment.created_at.isoformat()}), 201
