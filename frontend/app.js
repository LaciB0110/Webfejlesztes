const state = {
    categories: [],
    recipes: [],
    selectedCategoryId: null,
    editingCategoryId: null,
    editingRecipeId: null,
    authMode: 'login'
};

const elements = {
    categoryList: document.getElementById('category-list'),
    recipeList: document.getElementById('recipe-list'),
    categoryForm: document.getElementById('category-form'),
    recipeForm: document.getElementById('recipe-form'),
    recipeModal: document.getElementById('recipe-modal'),
    categoryModal: document.getElementById('category-modal'),
    authModal: document.getElementById('auth-modal'),
    userNav: document.getElementById('user-nav'),
    authTitle: document.getElementById('auth-title'),
    authForm: document.getElementById('auth-form'),
    authError: document.getElementById('auth-error'),
    authUsername: document.getElementById('auth-username'),
    authPassword: document.getElementById('auth-password')
};

function showMessage(el, text, type = 'error') {
    el.textContent = text;
    el.className = `inline-message ${type}`;
}

function openAuthModal() {
    elements.authForm.reset();
    elements.authError.textContent = '';
    elements.authError.className = 'inline-message hidden';
    elements.authModal.classList.add('visible');
}

function closeAuthModal() {
    elements.authModal.classList.remove('visible');
}

function updateRecipeCategorySelect() {
    const select = document.getElementById('recipe-category');
    if (!select) return;

    select.innerHTML = '<option value="">Válassz kategóriát</option>';
    state.categories.forEach(c => {
        const o = document.createElement('option');
        o.value = c.id;
        o.textContent = c.name;
        select.appendChild(o);
    });
}

function openCategoryModal(category = null) {
    state.editingCategoryId = category ? category.id : null;
    elements.categoryForm.reset();

    if (category) {
        document.getElementById('category-name').value = category.name;
        document.getElementById('category-description').value = category.description || '';
    }

    elements.categoryModal.classList.add('visible');
}

function closeCategoryModal() {
    elements.categoryModal.classList.remove('visible');
    elements.categoryForm.reset();
    state.editingCategoryId = null;
}

function openRecipeModal(recipe = null) {
    state.editingRecipeId = recipe ? recipe.id : null;
    elements.recipeForm.reset();
    updateRecipeCategorySelect();

    if (recipe) {
        document.getElementById('recipe-title').value = recipe.title;
        document.getElementById('recipe-ingredients').value = recipe.ingredients;
        document.getElementById('recipe-instructions').value = recipe.instructions;
        document.getElementById('recipe-prep-time').value = recipe.prep_time;
        document.getElementById('recipe-category').value = recipe.category_id;
    } else if (state.categories[0]) {
        document.getElementById('recipe-category').value = state.categories[0].id;
    }

    elements.recipeModal.classList.add('visible');
}

function closeRecipeModal() {
    elements.recipeModal.classList.remove('visible');
    elements.recipeForm.reset();
    state.editingRecipeId = null;
}

async function loadCategories() {
    state.categories = await fetch('/api/categories').then(r => r.json());
    updateRecipeCategorySelect();
    renderCategories();
}

async function loadRecipes() {
    state.recipes = await fetch('/api/recipes').then(r => r.json());
    renderRecipes();
}

function renderCategories() {
    const list = state.categories;
    elements.categoryList.innerHTML = '';

    const all = document.createElement('button');
    all.type = 'button';
    all.className = `category-button ${state.selectedCategoryId === null ? 'active' : ''}`;
    all.innerHTML = `<div>Összes</div><div class="category-meta"><span>Blog</span><span>${state.recipes.length} recept</span></div>`;
    all.addEventListener('click', () => {
        state.selectedCategoryId = null;
        renderCategories();
        renderRecipes();
    });
    elements.categoryList.appendChild(all);

    list.forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-item';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = `category-button ${state.selectedCategoryId === category.id ? 'active' : ''}`;
        button.innerHTML = `<div>${category.name}</div><div class="category-meta"><span>Receptek</span><span>${category.recipe_count}</span></div>`;
        button.addEventListener('click', () => {
            if (isLoggedIn()) {
                openCategoryModal(category);
                return;
            }
            state.selectedCategoryId = category.id;
            renderCategories();
            renderRecipes();
        });
        button.addEventListener('contextmenu', (event) => {
            if (!isLoggedIn()) return;
            event.preventDefault();
            deleteCategory(category.id);
        });

        item.appendChild(button);
        elements.categoryList.appendChild(item);
    });
}

function renderRecipes() {
    const filtered = state.selectedCategoryId === null
        ? state.recipes
        : state.recipes.filter(r => r.category_id === state.selectedCategoryId);

    elements.recipeList.innerHTML = '';

    if (!filtered.length) {
        elements.recipeList.innerHTML = '<div class="empty-state">Nincs megjeleníthető recept.</div>';
        return;
    }

    filtered.forEach(recipe => {
        const card = document.createElement('article');
        card.className = 'recipe-card';

        const loggedUser = getAuthState().username && getAuthState().username !== 'admin' ? getAuthState().username : 'Vendég';
        const comments = (recipe.comments || []).map(c => `<div class="comment-item"><div class="comment-top"><strong>${c.author}</strong><span>${new Date(c.created_at).toLocaleDateString('hu-HU')}</span></div><div>${c.content}</div></div>`).join('');

        card.innerHTML = `
            <div class="recipe-header">
              <h3>${recipe.title}</h3>
              <span class="badge">${recipe.category_name}</span>
            </div>
            <div class="meta-line">Elkészítési idő: ${recipe.prep_time} perc</div>
            <div>
              <div class="section-label">Hozzávalók</div>
              <div>${recipe.ingredients.replace(/\n/g, '<br>')}</div>
            </div>
            <div>
              <div class="section-label">Elkészítés</div>
              <div>${recipe.instructions.replace(/\n/g, '<br>')}</div>
            </div>
            <div>
              <div class="section-label">Vélemények</div>
              <div class="comment-list">${comments}</div>
            </div>
            <div class="comment-form">
              <textarea id="comment-content-${recipe.id}" placeholder="Írd meg a véleményed..."></textarea>
              <button type="button" class="primary-button" data-comment-add="${recipe.id}">Vélemény küldése</button>
            </div>
        `;

        const addBtn = card.querySelector('[data-comment-add]');
        addBtn.addEventListener('click', async () => {
            const author = getAuthState().username && getAuthState().username !== 'admin' ? getAuthState().username : 'Vendég';
            const content = document.getElementById(`comment-content-${recipe.id}`).value.trim();
            if (!content) return alert('Írd meg a véleményedet!');
            const res = await fetch(`/api/recipes/${recipe.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author, content }) });
            const data = await res.json();
            if (!res.ok) return alert(data.message || 'Nem sikerült menteni a véleményt.');
            await loadRecipes();
        });

        if (isLoggedIn()) {
            const actions = document.createElement('div');
            actions.className = 'form-actions';
            actions.innerHTML = '<button type="button" class="secondary-button" data-edit-recipe="'+recipe.id+'">Szerkesztés</button><button type="button" class="danger-button" data-delete-recipe="'+recipe.id+'">Törlés</button>';
            actions.querySelector('[data-edit-recipe]').addEventListener('click', () => openRecipeModal(recipe));
            actions.querySelector('[data-delete-recipe]').addEventListener('click', () => deleteRecipe(recipe.id));
            card.appendChild(actions);
        }
        elements.recipeList.appendChild(card);
    });
}

async function createOrUpdateCategory(event) {
    event.preventDefault();
    const name = document.getElementById('category-name').value.trim();
    const description = document.getElementById('category-description').value.trim();
    const url = state.editingCategoryId ? `/api/categories/${state.editingCategoryId}` : '/api/categories';
    const method = state.editingCategoryId ? 'PUT' : 'POST';
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({ name, description })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || 'Hiba a kategória mentésekor.');
    closeCategoryModal();
    await loadCategories();
    await loadRecipes();
}

async function createOrUpdateRecipe(event) {
    event.preventDefault();
    const title = document.getElementById('recipe-title').value.trim();
    const ingredients = document.getElementById('recipe-ingredients').value.trim();
    const instructions = document.getElementById('recipe-instructions').value.trim();
    const prepTime = document.getElementById('recipe-prep-time').value;
    const categoryId = document.getElementById('recipe-category').value;
    const url = state.editingRecipeId ? `/api/recipes/${state.editingRecipeId}` : '/api/recipes';
    const method = state.editingRecipeId ? 'PUT' : 'POST';
    const res = await fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({
            title,
            ingredients,
            instructions,
            prep_time: prepTime,
            category_id: categoryId
        })
    });

    const data = await res.json();
    if (!res.ok) return alert(data.message || 'Hiba a recept mentésekor.');
    closeRecipeModal();
    await loadCategories();
    await loadRecipes();
}

async function deleteCategory(id) {
    if (!confirm('Biztosan törlöd?')) return;

    const res = await fetch(`/api/categories/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
    });

    if (!res.ok) return alert('Nem sikerült törölni.');

    state.selectedCategoryId = null;
    await loadCategories();
    await loadRecipes();
}

async function deleteRecipe(id) {
    if (!confirm('Biztosan törlöd ezt a receptet?')) return;

    const res = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeader()
    });

    if (!res.ok) return alert('Nem sikerült törölni.');

    await loadRecipes();
    await loadCategories();
}

function updateUserNav() {
    const auth = getAuthState();
    if (auth.token) {
        elements.userNav.innerHTML = `<span>Adminisztráció</span><button class="nav-button" id="logout-btn">Kijelentkezés</button><button class="primary-button" id="new-category-btn">+ Kategória</button><button class="primary-button" id="new-recipe-btn">+ Recept</button>`;
        document.getElementById('logout-btn').addEventListener('click', logoutUser);
        document.getElementById('new-category-btn').addEventListener('click', () => openCategoryModal());
        document.getElementById('new-recipe-btn').addEventListener('click', () => openRecipeModal());
    } else {
        elements.userNav.innerHTML = '<button class="nav-button" id="login-btn">Bejelentkezés</button>';
        document.getElementById('login-btn').addEventListener('click', openAuthModal);
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    try {
        const data = await login(elements.authUsername.value.trim(), elements.authPassword.value);
        closeAuthModal();
        updateUserNav();
        await loadCategories();
        await loadRecipes();
        if (data.username === 'admin') showMessage(elements.authError, 'Sikeres bejelentkezés.', 'success');
    } catch (error) {
        showMessage(elements.authError, error.message, 'error'); elements.authError.classList.remove('hidden');
    }
}

async function init() {
    updateUserNav();
    elements.authForm.addEventListener('submit', handleAuthSubmit);
    elements.categoryForm.addEventListener('submit', createOrUpdateCategory);
    elements.recipeForm.addEventListener('submit', createOrUpdateRecipe);
    document.getElementById('close-category-modal').addEventListener('click', closeCategoryModal);
    document.getElementById('close-recipe-modal').addEventListener('click', closeRecipeModal);
    document.getElementById('close-auth-modal').addEventListener('click', closeAuthModal);
    await loadCategories();
    await loadRecipes();
}

init();
