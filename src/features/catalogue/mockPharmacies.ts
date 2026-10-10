// src/data/mockPharmacies.ts

import type { MedicineItem, MapPharmacy } from './pharmacy';

// তোমার আগের complete MEDICINES array
export const MEDICINES: MedicineItem[] = [
    {
        id: 'napa',
        name: 'Napa Extra 500mg/65mg',
        generic: 'Paracetamol + Caffeine',
        category: 'Fever & Pain',
        price: 30,
    },
    {
        id: 'ventolin',
        name: 'Ventolin Evohaler 100mcg',
        generic: 'Salbutamol Sulfate',
        category: 'Asthma Inhaler',
        price: 240,
    },
    {
        id: 'lantus',
        name: 'Lantus Solostar Insulin',
        generic: 'Insulin Glargine 100IU',
        category: 'Diabetes Care',
        price: 860,
    },
    {
        id: 'monas',
        name: 'Monas 10',
        generic: 'Montelukast Sodium 10mg',
        category: 'Respiratory',
        price: 160,
    },
    {
        id: 'zithrin',
        name: 'Zithrin 500mg',
        generic: 'Azithromycin',
        category: 'Antibiotic',
        price: 175,
    },
    {
        id: 'nexum',
        name: 'Nexum 20mg',
        generic: 'Esomeprazole',
        category: 'Gastric Relief',
        price: 120,
    },
    {
        id: 'antivenom',
        name: 'Snake Antivenom Polyvalent',
        generic: 'Lyophilized Antivenin',
        category: 'Emergency ICU',
        price: 1250,
    },
];

export const USER_LOCATION = {
    name: 'Your Location',
    area: 'Tejgaon / Farmgate Corridor',
    city: 'Dhaka City',
    x: 375,
    y: 395,
};

const createInventory = () => ({
    napa: { inStock: true, units: 85, price: 30 },
    ventolin: { inStock: true, units: 14, price: 240 },
    lantus: { inStock: true, units: 8, price: 860 },
    monas: { inStock: true, units: 35, price: 160 },
    zithrin: { inStock: true, units: 19, price: 175 },
    nexum: { inStock: true, units: 60, price: 120 },
    antivenom: { inStock: true, units: 3, price: 1250 },
});

export const PHARMACIES: MapPharmacy[] = [
    {
        id: 'old-dhaka-pharma',
        name: 'Al-Madina Central Pharmacy',
        area: 'Old Dhaka',
        address: '28/A Mitford Road, Kotwali, Old Dhaka',
        phone: '+8801711456789',
        x: 585,
        y: 645,
        distanceKm: 4.8,
        driveTimeMin: 14,
        isOpen24h: true,
        rating: 4.9,
        routePath:
            'M 375 395 L 402 397 Q 416 398 418 412 L 420 450 Q 421 463 432 469 L 452 481 Q 464 489 465 504 L 466 532 Q 467 544 479 549 L 516 564 Q 529 570 532 583 L 537 602 Q 540 612 551 618 L 573 629 Q 585 634 585 645',
        routeArrows: [
            { x: 418, y: 430, angle: 90 },
            { x: 466, y: 521, angle: 90 },
            { x: 520, y: 567, angle: 30 },
            { x: 570, y: 628, angle: 28 },
        ],
        inventory: createInventory(),
    },
    {
        id: 'dhanmondi-pharma',
        name: 'Labaid Super Dispensary',
        area: 'Dhanmondi',
        address: 'House 1, Road 4, Dhanmondi R/A, Dhaka',
        phone: '+8801712334455',
        x: 230,
        y: 590,
        distanceKm: 2.1,
        driveTimeMin: 7,
        isOpen24h: true,
        rating: 4.8,
        routePath:
            'M 375 395 L 342 395 Q 330 395 325 407 L 319 427 Q 315 440 303 443 L 289 447 Q 277 450 275 463 L 268 492 Q 265 507 257 515 L 243 530 Q 235 539 235 555 L 230 590',
        routeArrows: [
            { x: 343, y: 395, angle: 180 },
            { x: 276, y: 466, angle: 105 },
            { x: 235, y: 553, angle: 90 },
        ],
        inventory: {
            ...createInventory(),
            antivenom: { inStock: false, units: 0, price: 1250 },
        },
    },
    {
        id: 'mirpur-pharma',
        name: 'Tamanna Model Pharmacy',
        area: 'Mirpur',
        address: 'Plot 3, Main Roundabout, Mirpur-10, Dhaka',
        phone: '+8801819887766',
        x: 250,
        y: 250,
        distanceKm: 3.4,
        driveTimeMin: 11,
        isOpen24h: true,
        rating: 4.7,
        routePath:
            'M 375 395 L 359 373 Q 352 363 352 349 L 350 332 Q 349 320 338 314 L 316 303 Q 302 297 296 286 L 284 267 Q 278 256 264 253 L 250 250',
        routeArrows: [
            { x: 354, y: 355, angle: -95 },
            { x: 317, y: 303, angle: -155 },
            { x: 269, y: 254, angle: -168 },
        ],
        inventory: {
            ...createInventory(),
            lantus: { inStock: false, units: 0, price: 860 },
            antivenom: { inStock: false, units: 0, price: 1250 },
        },
    },
    {
        id: 'uttara-pharma',
        name: 'Apollo Care Dispensary',
        area: 'Uttara',
        address: 'Sector 7, Road 1, Jasimuddin Avenue, Uttara',
        phone: '+8801911223344',
        x: 565,
        y: 195,
        distanceKm: 6.2,
        driveTimeMin: 18,
        isOpen24h: false,
        rating: 4.8,
        routePath:
            'M 375 395 L 392 367 Q 398 358 400 344 L 408 319 Q 412 306 421 299 L 447 279 Q 457 271 462 258 L 477 237 Q 484 226 499 224 L 530 213 Q 542 209 550 201 L 565 195',
        routeArrows: [
            { x: 399, y: 344, angle: -75 },
            { x: 455, y: 272, angle: -42 },
            { x: 532, y: 212, angle: -20 },
        ],
        inventory: createInventory(),
    },
    {
        id: 'gulshan-pharma',
        name: 'MediLife Premier Chemist',
        area: 'Gulshan',
        address: 'Plot 14, Road 113, Gulshan-2 Avenue, Dhaka',
        phone: '+8801714556677',
        x: 720,
        y: 370,
        distanceKm: 3.1,
        driveTimeMin: 9,
        isOpen24h: true,
        rating: 4.9,
        routePath:
            'M 375 395 L 408 394 Q 423 394 429 383 L 438 377 L 479 377 Q 491 377 499 383 L 525 390 Q 536 394 549 386 L 570 373 Q 582 367 595 368 L 628 371 Q 639 372 649 368 L 683 366 Q 699 365 705 370 L 720 370',
        routeArrows: [
            { x: 407, y: 394, angle: 0 },
            { x: 480, y: 377, angle: 0 },
            { x: 572, y: 373, angle: -25 },
            { x: 681, y: 366, angle: 0 },
        ],
        inventory: {
            ...createInventory(),
            ventolin: { inStock: false, units: 0, price: 240 },
            antivenom: { inStock: false, units: 0, price: 1250 },
        },
    },
];