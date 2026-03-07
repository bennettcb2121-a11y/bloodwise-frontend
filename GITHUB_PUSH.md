# Get your Cursor code back onto GitHub

If the repo URL shows **"nothing here"** or **"repository not found"**, the repo does not exist yet. Create it, then push.

---

## 1. Create the repo on GitHub

1. Open: **https://github.com/new**
2. **Repository name:** `bloodwise-frontend`
3. Leave **Public** selected.
4. **Important:** Leave **"Add a README file"** **unchecked** (you already have code).
5. Click **Create repository**.

---

## 2. Set the remote (use your real GitHub username)

In **Cursor's terminal** (in this project folder), copy-paste:

```bash
git remote set-url origin https://github.com/bennettcb2121-a11y/bloodwise-frontend.git
```

---

## 3. Push your code

```bash
git push -u origin main
```

If Git says the histories don't match (e.g. you had emptied the repo before), use:

```bash
git push -u origin main --force
```

When it asks for **password**, use a **Personal Access Token**:  
GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic) → check **repo** → generate, then paste when prompted.

---

After a successful push, your GitHub repo will show all the same files as in Cursor.
