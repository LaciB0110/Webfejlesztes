import datetime
from functools import wraps

import jwt
from flask import g, jsonify, request
from werkzeug.security import check_password_hash

from config import SECRET_KEY
from models import User


def get_token():
    token = request.headers.get('Authorization', '')
    return token.split(' ', 1)[1] if token.startswith('Bearer ') else None


def token_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = get_token()
        if not token:
            return jsonify({'message': 'Hiányzó token.'}), 401
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        except Exception:
            return jsonify({'message': 'Érvénytelen token.'}), 401
        user = User.query.get(payload.get('user_id'))
        if not user:
            return jsonify({'message': 'Felhasználó nem létezik.'}), 401
        g.user = user
        return f(*args, **kwargs)
    return wrapper


def login_user(username, password):
    user = User.query.filter_by(username=username).first()
    if not user or not check_password_hash(user.password_hash, password):
        return None
    exp = datetime.datetime.utcnow() + datetime.timedelta(hours=12)
    return jwt.encode({'user_id': user.id, 'exp': exp}, SECRET_KEY, algorithm='HS256')
