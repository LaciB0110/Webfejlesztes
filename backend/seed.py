from werkzeug.security import generate_password_hash
from models import Category, Recipe, User, db


def ensure_default_admin():
    if not User.query.filter_by(username='admin').first():
        db.session.add(User(username='admin', password_hash=generate_password_hash('admin')))
        db.session.commit()


def seed_demo_data():
    if Category.query.count():
        return
    cats = {'Levesek': 'Hűsítő és tápláló levesek.', 'Főételek': 'Pörkölt és főételek.', 'Desszertek': 'Könnyű édességek.'}
    for name, desc in cats.items():
        db.session.add(Category(name=name, description=desc))
    db.session.commit()
    by_name = {c.name: c for c in Category.query.all()}
    recipes = [
        ('Gombaleves', '- 500 g gomba\n- 1 hagyma\n- 1 l alaplé', 'Pároljuk a gombát és a hagymát, majd adjuk hozzá az alaplevet és főzzük 20 percig.', 30, 'Levesek'),
        ('Csirkepaprikash', '- 600 g csirke\n- 2 paprika\n- 1 hagyma\n- 1 dl tejföl', 'Pirítsuk meg a húst és a zöldséget, öntsük fel vízzel és főzzük puhára. Végül adjuk hozzá a tejfölt.', 45, 'Főételek'),
        ('Almás pite', '- 4 alma\n- 200 g liszt\n- 100 g cukor\n- 1 tojás', 'Keverjük össze a tésztát, tegyük rá az almát, majd süssük meg 40 percig.', 50, 'Desszertek'),
    ]
    for title, ingredients, instructions, prep_time, category in recipes:
        db.session.add(Recipe(title=title, ingredients=ingredients, instructions=instructions, prep_time=prep_time, category_id=by_name[category].id))
    db.session.commit()
