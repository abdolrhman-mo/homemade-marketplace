# Homemade Marketplace

Home-cooked-food marketplace web app — Node.js + Express + MongoDB. Built for the **Distributed and Mobile Databases** course; designed around a 3-node MongoDB replica set (`rs0`).

## Run locally (single-laptop simulation of the 3-node replica set)

The lab originally deployed one `mongod` per physical PC. The scripts under `scripts/` simulate the same 3-node replica set on **one laptop** by running three `mongod` processes on `localhost:27017`, `:27018`, `:27019`.

**Prerequisites**
- Node.js 18+
- MongoDB 6+ (`mongod` binary). The scripts default to `C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe`; override with `MONGOD=...` if yours lives elsewhere.

**Steps**

```bash
npm install
npm run rs:up      # spawn 3 mongods on :27017, :27018, :27019
npm run rs:init    # initialize replica set rs0 (idempotent)
npm run rs:status  # verify: 1 PRIMARY + 2 SECONDARY
npm run seed       # load data/*.json into MongoDB
npm start          # Express server on :3000
```

Open http://localhost:3000.

When done: `npm run rs:down` stops all three mongods.

**Failover demo**

```bash
npm run rs:status            # note which member is PRIMARY (e.g., n1)
# kill the PRIMARY's PID (from .mongo-data/pids.json)
npm run rs:status            # a SECONDARY has been promoted to PRIMARY
```

The Mongoose driver auto-discovers the new primary via `replicaSet=rs0`, so the running app keeps serving requests across the failover.

**Lab deployment (3 physical PCs)**

Override the URI:
```
MONGO_URI=mongodb://<ip1>:27017,<ip2>:27017,<ip3>:27017/food-delivery?replicaSet=rs0 npm start
```

---

## Project Contributors

This document outlines the contributions made by each team member to the project.


### Makady
**Authentication Pages & Profile Page**
- Login page (`login.html`, `login.css`)
- Register page (`register.html`, `register.css`)
- Cook dashboard page (`cook-dashboard.html`, `cook-dashboard.css`)

**Backend Endpoints:**
- `POST /api/register` - User registration (already implemented)
- `POST /api/login` - User login (already implemented)
- `GET /api/user/meals` - Get meals I'm selling

### Bassant
**Home & About Pages**
- Home page (`home/index.html`, `home/home.css`, `home/home.js`)
- About page (`about/about.html`, `about/about.css`)
- Home page image assets (9 images)

**Backend Endpoints:**
- Server setup

### Shahd
**Meals Listing Page**
- Meals project/listing page (`mealsproject.html`)

**Backend Endpoints:**
- `GET /api/meals` - Get all meals
- `GET /api/meals?search=...` - Search meals
- `POST /api/meals` - Create a meal

### Nadine
**Cart & Meal Details**
- Shopping cart page (`cart.html`, `cart.css`, `cart.js`)
- Meal details page (`meal-details.html`, `meal-details.css`, `meal-details.js`)

**Backend Endpoints:**
- `GET /api/meals/:id` - Get meal by ID
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add item to cart
- `DELETE /api/cart/:id` - Remove item from cart

### Melissia
**Checkout & Order Tracking**
- Checkout page (`checkout.html`, `css/checkout.css`, `js/checkout.js`)
- Order tracking page (`order-tracking.html`, `css/tracking.css`, `js/tracking.js`)

**Backend Endpoints:**
- `POST /api/orders` - Create an order
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID

---

*Generated: December 2025*
