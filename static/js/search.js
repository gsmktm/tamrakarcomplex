const searchForm = document.getElementById("search-form");
const resultsContainer = document.getElementById("results");

function formatCurrency(value) {
  return new Intl.NumberFormat("en-NP", {
    style: "currency",
    currency: "NPR",
    maximumFractionDigits: 0,
  }).format(value);
}

function renderResults(phones) {
  if (!phones.length) {
    resultsContainer.innerHTML = `<p class="hint">No phones matched your search. Try a different keyword or broaden your filters.</p>`;
    return;
  }

  const cards = phones
    .map((phone) => {
      const storageOptions = phone.storage.join(", ");
      return `
      <article class="result-card">
        <header>
          <h3>${phone.brand} · ${phone.name}</h3>
          <p class="price">Official: ${formatCurrency(phone.official_price)} · Exchange base: ${formatCurrency(
            phone.base_price
          )}</p>
        </header>
        <ul>
          <li><strong>Display:</strong> ${phone.display}</li>
          <li><strong>Chipset:</strong> ${phone.chipset}</li>
          <li><strong>Camera:</strong> ${phone.camera}</li>
          <li><strong>Storage:</strong> ${storageOptions}</li>
        </ul>
      </article>
    `;
    })
    .join("");

  resultsContainer.innerHTML = `<div class="result-grid">${cards}</div>`;
}

if (searchForm) {
  searchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(searchForm);
    const query = formData.get("query").trim();

    if (!query) {
      resultsContainer.innerHTML = `<p class="hint">Please enter a device name or brand to search.</p>`;
      return;
    }

    const params = new URLSearchParams();
    params.set("query", query);

    const brand = formData.get("brand");
    if (brand) {
      params.set("brand", brand);
    }

    const maxPrice = formData.get("max_price");
    if (maxPrice) {
      params.set("max_price", maxPrice);
    }

    resultsContainer.innerHTML = `<p class="hint">Searching inventory...</p>`;

    try {
      const response = await fetch(`/api/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Unable to fetch results");
      }
      const phones = await response.json();
      renderResults(phones);
    } catch (error) {
      resultsContainer.innerHTML = `<p class="error">${error.message}. Please try again shortly.</p>`;
    }
  });
}
