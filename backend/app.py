from flask import Flask
from flask_cors import CORS

from config import DB_PATH, SECRET_KEY
from models import db
from routes import register_routes
from seed import ensure_default_admin, seed_demo_data


def create_app():
    app = Flask(__name__, static_folder='..\\frontend', static_url_path='')
    app.config['SECRET_KEY'] = SECRET_KEY
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + DB_PATH
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    CORS(app)
    db.init_app(app)

    with app.app_context():
        db.create_all()
        seed_demo_data()
        ensure_default_admin()

    register_routes(app)
    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)