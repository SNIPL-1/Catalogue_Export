const DATA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTp1LlW5tsWIyE7E5BGFiKHS2qBjzh8wGaZdR3EsQSzXVyxgq1hrh4y54KpkVHiL-4Moux0CA43c4nb/pub?output=csv";
const IMAGE_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTp1LlW5tsWIyE7E5BGFiKHS2qBjzh8wGaZdR3EsQSzXVyxgq1hrh4y54KpkVHiL-4Moux0CA43c4nb/pub?gid=676833393&single=true&output=csv";
const CATEGORY_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTp1LlW5tsWIyE7E5BGFiKHS2qBjzh8wGaZdR3EsQSzXVyxgq1hrh4y54KpkVHiL-4Moux0CA43c4nb/pub?gid=1151803807&single=true&output=csv"; // <-- Add your Categories sheet link here

let allData = [];
let imageMap = {};
let categoryImageMap = {};
let currentCategory = null;
let currentItemCode = null;
let currentSearchResults = null;

/* ---------- Load Data ---------- */
Promise.all([
  fetch(DATA_URL).then(res => res.text()),
  fetch(IMAGE_URL).then(res => res.text()),
  fetch(CATEGORY_URL).then(res => res.text())
])
.then(([dataText, imageText, categoryText]) => {
  // Parse main items data
  allData = Papa.parse(dataText, { header: true }).data
    .filter(row => row["Item Code"] && row["Category"]);

  // Clean up category names
  allData.forEach(row => row["Category"] = row["Category"].trim());

  // Parse item images
  const imageParsed = Papa.parse(imageText, { header: true }).data;
  imageParsed.forEach(row => {
    if (row["Item Code"] && row["Image URL"]) {
      imageMap[row["Item Code"].trim()] = row["Image URL"];
    }
  });

  // Parse category images
  const categoryParsed = Papa.parse(categoryText, { header: true }).data;
  categoryParsed.forEach(row => {
    if (row["Category"] && row["Image URL"]) {
      categoryImageMap[row["Category"].trim()] = row["Image URL"];
    }
  });

  renderCategories();
})
.catch(() => {
  document.getElementById("catalogue").innerHTML = "<p>❌ Failed to load data.</p>";
});

/* ---------- Breadcrumb Navigation ---------- */
function renderBreadcrumb(level) {
  const breadcrumb = document.getElementById("breadcrumb");
  let html = '';
  if (level === "category") {
    html = `<button class="back-btn" onclick="renderCategories()">⬅ Back to Categories</button>`;
  } else if (level === "item") {
    html = `<button class="back-btn" onclick="renderItems('${currentCategory}')">⬅ Back to ${currentCategory}</button>`;
  } else if (level === "search") {
    html = `<button class="back-btn" onclick="clearSearch()">⬅ Back to Home</button>`;
  }
  breadcrumb.innerHTML = html;
}

/* ---------- Home Page (Categories) ---------- */
function renderCategories() {
  currentCategory = null;
  currentItemCode = null;
  currentSearchResults = null;
  renderBreadcrumb("");

  const container = document.getElementById("catalogue");
  container.innerHTML = `<h2>Product Categories</h2><div class="grid"></div>`;
  const grid = container.querySelector(".grid");

  const categories = [...new Set(allData.map(item => item["Category"]))];
  categories.sort();

  categories.forEach(cat => {
    const div = document.createElement("div");
    div.className = "card category-card";
    const catImg = categoryImageMap[cat] || "default-category.jpg";
    div.innerHTML = `
      <img src="${catImg}" alt="${cat}" class="card-image"/>
      <div class="card-title">${cat}</div>
    `;
    div.onclick = () => renderItems(cat);
    grid.appendChild(div);
  });
}

/* ---------- Category Page (Items) ---------- */
function renderItems(category) {
  currentCategory = category;
  renderBreadcrumb("category");
  const container = document.getElementById("catalogue");
  container.innerHTML = `<h2>${category}</h2><div class="grid"></div>`;
  const grid = container.querySelector(".grid");

  const items = [...new Set(
    allData
      .filter(row => row["Category"] === category)
      .map(row => row["Item Code"])
  )];

  items.forEach(code => {
    const div = document.createElement("div");
    div.className = "card";
    const img = imageMap[code] || "default.jpg";
    const item = allData.find(row => row["Item Code"] === code);
    const itemName = item?.["Item Name"] || "";
    
    // 🔹 Added item code display under name
    div.innerHTML = `
      <img src="${img}" alt="${code}" class="card-image"/>
      <div class="card-title">${itemName}</div>
      <div class="card-code">Code: ${code}</div>
    `;
    div.onclick = () => renderItemDetail(code);
    grid.appendChild(div);
  });
}

/* ---------- Item Detail Page ---------- */
function renderItemDetail(itemCode) {
  currentItemCode = itemCode;
  renderBreadcrumb("item");
  const container = document.getElementById("catalogue");

  // 🔹 Filter by BOTH category and item code
  const entries = allData.filter(
    row => row["Item Code"] === itemCode && row["Category"] === currentCategory
  );

  const first = entries[0];
  const img = imageMap[itemCode] || "default.jpg";

  container.innerHTML = `
    <h2>${first["Item Name"]}</h2>
    <p class="meta"><strong>Item Code:</strong> ${first["Item Code"]} | <strong>HSN Code:</strong> ${first["HSN Code"]}</p>
    <img src="${img}" alt="${itemCode}" class="detail-image"/>
    <p class="specs"><em>${first["Specs"]}</em></p>
    <table>
      <tr>
        <th>Variant Code</th>
        <th>Description</th>
        <th>Price/Unit</th>
        <th>Unit</th>
        <th>MOQ</th>
        <th>WhatsApp</th>
      </tr>
      ${entries
        .reduce((unique, entry) => {
          // Ensure unique Variant Codes
          if (!unique.some(e => e["Variant Code"] === entry["Variant Code"])) {
            unique.push(entry);
          }
          return unique;
        }, [])
        .map(entry => {
          const msg = encodeURIComponent(
            `Hi, I’m interested in this tool:\nItem: ${first["Item Name"]}\nVariant Code: ${entry["Variant Code"]}\nDescription: ${entry["Description"]}\nPrice: ${entry["Price/Unit"]}`
          );
          return `
            <tr>
              <td>${entry["Variant Code"]}</td>
              <td>${entry["Description"]}</td>
              <td>${entry["Price/Unit"]}</td>
              <td>${entry["Unit"]}</td>
              <td>${entry["MOQ"]}</td>
              <td><a class="wa-link" target="_blank" href="https://wa.me/917986297302?text=${msg}"><i class="fab fa-whatsapp"></i> Chat</a></td>
            </tr>
          `;
        })
        .join("")}
    </table>
  `;
}


/* ---------- Global Search ---------- */
function performSearch() {
  const query = document.getElementById("searchInput").value.trim().toLowerCase();
  if (!query) return;

  currentSearchResults = allData.filter(row =>
    row["Item Code"].toLowerCase().includes(query) ||
    row["Item Name"].toLowerCase().includes(query) ||
    row["Category"].toLowerCase().includes(query)
  );

  renderBreadcrumb("search");
  const container = document.getElementById("catalogue");
  container.innerHTML = `<h2>Search Results for "${query}"</h2><div class="grid"></div>`;
  const grid = container.querySelector(".grid");

  const uniqueItems = [...new Set(currentSearchResults.map(row => row["Item Code"]))];
  if (uniqueItems.length === 0) {
    grid.innerHTML = "<p>No results found.</p>";
    return;
  }

  uniqueItems.forEach(code => {
    const div = document.createElement("div");
    div.className = "card";
    const img = imageMap[code] || "default.jpg";
    const itemName = allData.find(row => row["Item Code"] === code)?.["Item Name"] || "";
    div.innerHTML = `
      <img src="${img}" alt="${code}" class="card-image"/>
      <div class="card-title">${itemName || code}</div>
    `;
    div.onclick = () => renderItemDetail(code);
    grid.appendChild(div);
  });
}

function clearSearch() {
  document.getElementById("searchInput").value = "";
  renderCategories();
}



