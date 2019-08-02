class Capacity {
    constructor(capacityInGiB) {
        this.capacityInGiB = capacityInGiB;
    }

    static fromTiB(capacityInTiB) {
        return new Capacity(capacityInTiB * 1024);
    }

    toString(precision = 2) {
        let capacity = this.capacityInGiB;
        let unit = 0;
        const units = ['GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
        while (capacity >= 1024) {
            capacity /= 1024;
            unit += 1;
        }

        return `${capacity.toFixed(precision)} ${units[unit]}`;
    }
}

module.exports = Capacity;
