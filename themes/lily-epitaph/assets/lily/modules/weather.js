(() => {
  const weatherCode = { 0: "晴朗", 1: "大致晴朗", 2: "局部多云", 3: "阴", 45: "雾", 48: "雾凇", 51: "毛毛雨", 61: "小雨", 63: "中雨", 65: "大雨", 71: "小雪", 80: "阵雨", 95: "雷暴" };
  for (const node of document.querySelectorAll("[data-lily-weather]")) {
    const latitude = Number(node.dataset.latitude), longitude = Number(node.dataset.longitude);
    const unit = node.dataset.unit === "fahrenheit" ? "fahrenheit" : "celsius";
    const state = node.querySelector(".lily-weather__state");
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !state) continue;
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({ latitude, longitude, current: "temperature_2m,weather_code", temperature_unit: unit }).toString();
    fetch(url, { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("天气服务不可用")))
      .then((data) => { const current = data.current || {}; state.textContent = `${weatherCode[current.weather_code] || "天气"} · ${current.temperature_2m ?? "--"}°${unit === "fahrenheit" ? "F" : "C"}`; })
      .catch(() => { state.textContent = "暂时无法获取天气"; });
  }
})();
