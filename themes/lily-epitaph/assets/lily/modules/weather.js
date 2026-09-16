(() => {
  const weatherCode = { 0: "晴朗", 1: "大致晴朗", 2: "局部多云", 3: "阴", 45: "雾", 48: "雾凇", 51: "毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨", 71: "小雪", 80: "阵雨", 95: "雷暴" };
  const cache = new Map();

  function loadWeather(url) {
    const key = url.href;
    if (!cache.has(key)) {
      cache.set(key, fetch(url, { headers: { Accept: "application/json" } })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error("天气服务不可用")))
        .catch((error) => { cache.delete(key); throw error; }));
    }
    return cache.get(key);
  }

  function initWeather() {
    for (const node of document.querySelectorAll("[data-lily-weather]:not([data-lily-weather-ready])")) {
      node.dataset.lilyWeatherReady = "true";
      const latitude = Number(node.dataset.latitude), longitude = Number(node.dataset.longitude);
      const unit = node.dataset.unit === "fahrenheit" ? "fahrenheit" : "celsius";
      const state = node.querySelector(".lily-weather__state");
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !state) continue;
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.search = new URLSearchParams({ latitude, longitude, current: "temperature_2m,weather_code", temperature_unit: unit }).toString();
      loadWeather(url)
        .then((data) => {
          if (!node.isConnected) return;
          const current = data.current || {};
          state.textContent = `${weatherCode[current.weather_code] || "天气"} · ${current.temperature_2m ?? "--"}°${unit === "fahrenheit" ? "F" : "C"}`;
        })
        .catch(() => { if (node.isConnected) state.textContent = "暂时无法获取天气"; });
    }
  }

  initWeather();
  document.addEventListener('lily:page-ready', initWeather);
})();
