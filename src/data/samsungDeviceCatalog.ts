export type SamsungDeviceCategory = "phone" | "tablet" | "watch";

export interface SamsungDeviceCatalogItem {
  name: string;
  category: SamsungDeviceCategory;
  announced: string;
  displayInches: number;
  chipset: string;
  batteryMah: number;
  storageGb: number;
  ramGb: number;
  sourceUrl: string;
}

// Samsung models and maximum listed memory configurations supplied from GSMArena.
export const SAMSUNG_DEVICE_CATALOG: SamsungDeviceCatalogItem[] = [
  { name: "Galaxy F06 5G", category: "phone", announced: "2025-02", displayInches: 6.7, chipset: "Dimensity 6300", batteryMah: 5000, storageGb: 128, ramGb: 6, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_f06_5g-13663.php" },
  { name: "Galaxy S25 Ultra", category: "phone", announced: "2025-01", displayInches: 6.9, chipset: "Snapdragon 8 Elite", batteryMah: 5000, storageGb: 1024, ramGb: 16, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_s25_ultra-13322.php" },
  { name: "Galaxy S25+", category: "phone", announced: "2025-01", displayInches: 6.7, chipset: "Snapdragon 8 Elite", batteryMah: 4900, storageGb: 512, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_s25+-13609.php" },
  { name: "Galaxy S25", category: "phone", announced: "2025-01", displayInches: 6.2, chipset: "Snapdragon 8 Elite", batteryMah: 4000, storageGb: 512, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_s25-13610.php" },
  { name: "Galaxy Z Fold Special", category: "phone", announced: "2024-10", displayInches: 8, chipset: "Snapdragon 8 Gen 3", batteryMah: 4400, storageGb: 512, ramGb: 16, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_z_fold_special-13452.php" },
  { name: "Galaxy A16", category: "phone", announced: "2024-10", displayInches: 6.7, chipset: "Helio G99", batteryMah: 5000, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a16-13383.php" },
  { name: "Galaxy A16 5G", category: "phone", announced: "2024-10", displayInches: 6.7, chipset: "Exynos 1330 / Dimensity 6300", batteryMah: 5000, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a16_5g-13346.php" },
  { name: "Galaxy S24 FE", category: "phone", announced: "2024-09", displayInches: 6.7, chipset: "Exynos 2400e", batteryMah: 4700, storageGb: 512, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_s24_fe-13262.php" },
  { name: "Galaxy Tab S10 Ultra", category: "tablet", announced: "2024-09", displayInches: 14.6, chipset: "Dimensity 9300+", batteryMah: 11200, storageGb: 1024, ramGb: 16, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_s10_ultra-13362.php" },
  { name: "Galaxy Tab S10+", category: "tablet", announced: "2024-09", displayInches: 12.4, chipset: "Dimensity 9300+", batteryMah: 10090, storageGb: 512, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_s10+-13363.php" },
  { name: "Galaxy M55s", category: "phone", announced: "2024-09", displayInches: 6.7, chipset: "Snapdragon 7 Gen 1", batteryMah: 5000, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_m55s-13354.php" },
  { name: "Galaxy F05", category: "phone", announced: "2024-09", displayInches: 6.7, chipset: "Helio G85", batteryMah: 5000, storageGb: 64, ramGb: 4, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_f05-13345.php" },
  { name: "Galaxy M05", category: "phone", announced: "2024-09", displayInches: 6.7, chipset: "Helio G85", batteryMah: 5000, storageGb: 64, ramGb: 4, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_m05-13327.php" },
  { name: "Galaxy A06", category: "phone", announced: "2024-08", displayInches: 6.7, chipset: "Helio G85", batteryMah: 5000, storageGb: 128, ramGb: 6, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a06-13265.php" },
  { name: "Galaxy F14 4G", category: "phone", announced: "2024-08", displayInches: 6.7, chipset: "Snapdragon 680 4G", batteryMah: 5000, storageGb: 64, ramGb: 4, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_f14_4g-13247.php" },
  { name: "Galaxy Z Fold6", category: "phone", announced: "2024-07", displayInches: 7.6, chipset: "Snapdragon 8 Gen 3", batteryMah: 4400, storageGb: 1024, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_z_fold6-13147.php" },
  { name: "Galaxy Z Flip6", category: "phone", announced: "2024-07", displayInches: 6.7, chipset: "Snapdragon 8 Gen 3", batteryMah: 4000, storageGb: 512, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_z_flip6-13192.php" },
  { name: "Galaxy Watch Ultra", category: "watch", announced: "2024-07", displayInches: 1.5, chipset: "Exynos W1000", batteryMah: 590, storageGb: 64, ramGb: 2, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_watch_ultra-13127.php" },
  { name: "Galaxy Watch7", category: "watch", announced: "2024-07", displayInches: 1.5, chipset: "Exynos W1000", batteryMah: 425, storageGb: 32, ramGb: 2, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_watch7-13128.php" },
  { name: "Galaxy Watch FE", category: "watch", announced: "2024-06", displayInches: 1.2, chipset: "Exynos W920", batteryMah: 247, storageGb: 16, ramGb: 1.5, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_watch_fe-13112.php" },
  { name: "Galaxy M35", category: "phone", announced: "2024-05", displayInches: 6.6, chipset: "Exynos 1380", batteryMah: 6000, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_m35-13006.php" },
  { name: "Galaxy F55", category: "phone", announced: "2024-05", displayInches: 6.7, chipset: "Snapdragon 7 Gen 1", batteryMah: 5000, storageGb: 256, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_f55-12885.php" },
  { name: "Galaxy C55", category: "phone", announced: "2024-04", displayInches: 6.7, chipset: "Snapdragon 7 Gen 1", batteryMah: 5000, storageGb: 256, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_c55-12945.php" },
  { name: "Galaxy M55", category: "phone", announced: "2024-03", displayInches: 6.7, chipset: "Snapdragon 7 Gen 1", batteryMah: 5000, storageGb: 256, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_m55-12896.php" },
  { name: "Galaxy Tab S6 Lite (2024)", category: "tablet", announced: "2024-03", displayInches: 10.4, chipset: "Exynos 1280", batteryMah: 7040, storageGb: 128, ramGb: 4, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_s6_lite_(2024)-12897.php" },
  { name: "Galaxy A55", category: "phone", announced: "2024-03", displayInches: 6.6, chipset: "Exynos 1480", batteryMah: 5000, storageGb: 256, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a55-12824.php" },
  { name: "Galaxy A35", category: "phone", announced: "2024-03", displayInches: 6.6, chipset: "Exynos 1380", batteryMah: 5000, storageGb: 256, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a35-12705.php" },
  { name: "Galaxy M15", category: "phone", announced: "2024-03", displayInches: 6.5, chipset: "Dimensity 6100+", batteryMah: 6000, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_m15-12833.php" },
  { name: "Galaxy M14 4G", category: "phone", announced: "2024-03", displayInches: 6.7, chipset: "Snapdragon 680 4G", batteryMah: 5000, storageGb: 128, ramGb: 6, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_m14_4g-12862.php" },
  { name: "Galaxy F15", category: "phone", announced: "2024-03", displayInches: 6.6, chipset: "Dimensity 6100+", batteryMah: 6000, storageGb: 128, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_f15-12831.php" },
  { name: "Galaxy S24 Ultra", category: "phone", announced: "2024-01", displayInches: 6.8, chipset: "Snapdragon 8 Gen 3", batteryMah: 5000, storageGb: 1024, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_s24_ultra-12771.php" },
  { name: "Galaxy S24+", category: "phone", announced: "2024-01", displayInches: 6.7, chipset: "Snapdragon 8 Gen 3", batteryMah: 4900, storageGb: 512, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_s24+-12772.php" },
  { name: "Galaxy S24", category: "phone", announced: "2024-01", displayInches: 6.2, chipset: "Snapdragon 8 Gen 3", batteryMah: 4000, storageGb: 512, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_s24-12773.php" },
  { name: "Galaxy XCover7", category: "phone", announced: "2024-01", displayInches: 6.6, chipset: "Dimensity 6100+", batteryMah: 4050, storageGb: 128, ramGb: 6, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_xcover7-12784.php" },
  { name: "Galaxy Tab Active5", category: "tablet", announced: "2024-01", displayInches: 8, chipset: "Exynos 1380", batteryMah: 5050, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_active5-12785.php" },
  { name: "Galaxy A25", category: "phone", announced: "2023-12", displayInches: 6.5, chipset: "Exynos 1280", batteryMah: 5000, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a25-12555.php" },
  { name: "Galaxy A15 5G", category: "phone", announced: "2023-12", displayInches: 6.5, chipset: "Dimensity 6100+", batteryMah: 5000, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a15_5g-12638.php" },
  { name: "Galaxy A15", category: "phone", announced: "2023-12", displayInches: 6.5, chipset: "Helio G99", batteryMah: 5000, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a15-12637.php" },
  { name: "Galaxy Tab A9+", category: "tablet", announced: "2023-10", displayInches: 11, chipset: "Snapdragon 695 5G", batteryMah: 7040, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_a9+-12617.php" },
  { name: "Galaxy Tab A9", category: "tablet", announced: "2023-10", displayInches: 8.7, chipset: "Helio G99", batteryMah: 5100, storageGb: 128, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_a9-12616.php" },
  { name: "Galaxy S23 FE", category: "phone", announced: "2023-10", displayInches: 6.4, chipset: "Exynos 2200", batteryMah: 4500, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_s23_fe-12520.php" },
  { name: "Galaxy Tab S9 FE+", category: "tablet", announced: "2023-10", displayInches: 12.4, chipset: "Exynos 1380", batteryMah: 10090, storageGb: 256, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_s9_fe+-12609.php" },
  { name: "Galaxy Tab S9 FE", category: "tablet", announced: "2023-10", displayInches: 10.9, chipset: "Exynos 1380", batteryMah: 8000, storageGb: 256, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_s9_fe-12517.php" },
  { name: "Galaxy A05s", category: "phone", announced: "2023-09", displayInches: 6.7, chipset: "Snapdragon 680 4G", batteryMah: 5000, storageGb: 128, ramGb: 6, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a05s-12584.php" },
  { name: "Galaxy A05", category: "phone", announced: "2023-09", displayInches: 6.7, chipset: "Helio G85", batteryMah: 5000, storageGb: 128, ramGb: 6, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_a05-12583.php" },
  { name: "Galaxy F34", category: "phone", announced: "2023-08", displayInches: 6.5, chipset: "Exynos 1280", batteryMah: 6000, storageGb: 128, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_f34-12453.php" },
  { name: "Galaxy Z Fold5", category: "phone", announced: "2023-07", displayInches: 7.6, chipset: "Snapdragon 8 Gen 2", batteryMah: 4400, storageGb: 1024, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_z_fold5-12418.php" },
  { name: "Galaxy Z Flip5", category: "phone", announced: "2023-07", displayInches: 6.7, chipset: "Snapdragon 8 Gen 2", batteryMah: 3700, storageGb: 512, ramGb: 8, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_z_flip5-12252.php" },
  { name: "Galaxy Tab S9 Ultra", category: "tablet", announced: "2023-07", displayInches: 14.6, chipset: "Snapdragon 8 Gen 2", batteryMah: 11200, storageGb: 1024, ramGb: 16, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_s9_ultra-12217.php" },
  { name: "Galaxy Tab S9+", category: "tablet", announced: "2023-07", displayInches: 12.4, chipset: "Snapdragon 8 Gen 2", batteryMah: 10090, storageGb: 512, ramGb: 12, sourceUrl: "https://www.gsmarena.com/samsung_galaxy_tab_s9+-12440.php" },
];
