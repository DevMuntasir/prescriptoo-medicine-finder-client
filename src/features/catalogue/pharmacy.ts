export interface MedicineItem {
    id: string;
    name: string;
    generic: string;
    category: string;
    price: number;
}

export interface PharmacyInventory {
    inStock: boolean;
    units: number;
    price: number;
}

export interface RouteArrow {
    x: number;
    y: number;
    angle: number;
}

export interface MapPharmacy {
    id: string;
    name: string;
    area: string;
    address: string;
    phone: string;
    x: number;
    y: number;
    distanceKm: number;
    driveTimeMin: number;
    isOpen24h: boolean;
    rating: number;
    routePath: string;
    routeArrows: RouteArrow[];
    inventory: Record<string, PharmacyInventory>;
}