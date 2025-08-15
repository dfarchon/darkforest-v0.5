export function getGasPriceFromURL(): number {
    const urlParams = new URLSearchParams(window.location.search);
    const gasPriceParam = urlParams.get('gasPrice');

    let res = 0.001;

    if (gasPriceParam) {
        const gasPrice = parseFloat(gasPriceParam);
        if (isNaN(gasPrice)) res = 0.001;
        else res = gasPrice;
    }

    localStorage.setItem('gasPrice', res.toString());


    return res;
}
