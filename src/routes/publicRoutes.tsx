import { lazy, Suspense } from "react";
import { Navigate, Route, useParams } from "react-router-dom";
import { RequireAuth } from "@/routes/RequireAuth";
import { ParamRouteRedirect } from "@/components/routing/ParamRouteRedirect";
import { WildcardRedirect } from "@/components/routing/WildcardRedirect";
import { RouteFallback } from "@/components/routing/RouteFallback";

// Eager load critical routes
import Index from "@/pages/Index";

// Lazy load other routes for performance optimization
const Auth = lazy(() => import("@/pages/Auth"));
const News = lazy(() => import("@/pages/News"));
const Reviews = lazy(() => import("@/pages/Reviews"));
const Products = lazy(() => import("@/pages/Products"));
const MobilePrice = lazy(() => import("@/pages/MobilePrice"));
const LaptopPrice = lazy(() => import("@/pages/LaptopPrice"));
const ArticleDetail = lazy(() => import("@/pages/ArticleDetail"));
const GuideDetail = lazy(() => import("@/pages/GuideDetail"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const BrandProducts = lazy(() => import("@/pages/BrandProducts"));
const MobilePriceBrand = lazy(() => import("@/pages/MobilePriceBrand"));
const Brands = lazy(() => import("@/pages/Brands"));
const MobileGuides = lazy(() => import("@/pages/MobileGuides"));
const LaptopGuides = lazy(() => import("@/pages/LaptopGuides"));
const Compare = lazy(() => import("@/pages/Compare"));
const MarketplaceBrowse = lazy(() => import("@/pages/marketplace/MarketplaceBrowse"));
const SellWizard = lazy(() => import("@/pages/marketplace/SellWizard"));
const ListingDetail = lazy(() => import("@/pages/marketplace/ListingDetail"));
const Stores = lazy(() => import("@/pages/Stores"));
const StoreApply = lazy(() => import("@/pages/StoreApply"));
const StoreDetail = lazy(() => import("@/pages/StoreDetail"));
const ComplexMap = lazy(() => import("@/pages/ComplexMap"));
const StoreManage = lazy(() => import("@/pages/StoreManage"));
const RepairHub = lazy(() => import("@/pages/RepairHub"));
const UnlockingHub = lazy(() => import("@/pages/UnlockingHub"));
const AutoSearchLandingPage = lazy(() => import("@/pages/AutoSearchLandingPage"));
const DeviceDetail = lazy(() => import("@/pages/repair/DeviceDetail"));
const GuideDetailRepair = lazy(() => import("@/pages/repair/GuideDetail"));
const RepairTracking = lazy(() => import("@/pages/repair/RepairTracking"));
const CustomRepairRequest = lazy(() => import("@/pages/CustomRepairRequest"));
const ContentPage = lazy(() => import("@/pages/ContentPage"));
const ContactUs = lazy(() => import("@/pages/ContactUs"));
const SellYourPhone = lazy(() => import("@/pages/sell/SellYourPhone"));
const ValuationEstimator = lazy(() => import("@/pages/ValuationEstimator"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const OrderSuccess = lazy(() => import("@/pages/OrderSuccess"));
const OrderFailed = lazy(() => import("@/pages/OrderFailed"));
const ServicesHub = lazy(() => import("@/pages/ServicesHub"));
const Wishlist = lazy(() => import("@/pages/Wishlist"));
const Unauthorized = lazy(() => import("@/pages/Unauthorized"));
const MySubscription = lazy(() => import("@/pages/MySubscription"));
const UserDashboard = lazy(() => import("@/pages/UserDashboard"));
const UserProfilePage = lazy(() => import("@/pages/user/UserProfilePage"));
const UserSettingsPage = lazy(() => import("@/pages/user/UserSettingsPage"));
const UserHistoryCenter = lazy(() => import("@/pages/user/UserHistoryCenter"));
const UserNotificationsPage = lazy(() => import("@/pages/user/UserNotificationsPage"));
const ModelHub = lazy(() => import("@/pages/ModelHub"));
const MobileCategoryPage = lazy(() => import("@/pages/MobileCategoryPage"));
const MobileBrandPage = lazy(() => import("@/pages/MobileBrandPage"));
const ModelDetailPage = lazy(() => import("@/pages/ModelDetailPage"));
const ProfileRedirect = lazy(() => import("@/components/routing/ProfileRedirect"));
const DashboardRedirect = lazy(() => import("@/components/routing/DashboardRedirect"));
const StoreRedirect = lazy(() => import("@/components/routing/StoreRedirect"));

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<RouteFallback />}>
    <Component />
  </Suspense>
);

function RedirectBrandToNew() {
  const { brand } = useParams<{ brand: string }>();
  return <Navigate to={`/cat/mobiles/${brand ?? ''}`} replace />;
}

function RedirectModelToNew() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/mobile/${slug ?? ''}`} replace />;
}

export const publicRoutes = (
  <>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={withSuspense(Auth)} />
    <Route path="/unauthorized" element={withSuspense(Unauthorized)} />
    <Route path="/checkout" element={<RequireAuth>{withSuspense(Checkout)}</RequireAuth>} />
    <Route path="/order-success" element={withSuspense(OrderSuccess)} />
    <Route path="/order-failed" element={withSuspense(OrderFailed)} />
    <Route path="/wishlist" element={withSuspense(Wishlist)} />
    <Route path="/marketplace" element={withSuspense(MarketplaceBrowse)} />
    <Route path="/sell-your-phone" element={withSuspense(SellYourPhone)} />
    <Route path="/exchange-your-phone" element={<Navigate to="/sell-your-phone?mode=exchange" replace />} />
    <Route path="/valuation-estimator" element={withSuspense(ValuationEstimator)} />
    <Route path="/services" element={withSuspense(ServicesHub)} />
    <Route path="/marketplace/sell" element={<RequireAuth>{withSuspense(SellWizard)}</RequireAuth>} />
    <Route path="/marketplace/edit/:id" element={<RequireAuth>{withSuspense(SellWizard)}</RequireAuth>} />
    <Route path="/marketplace/listing/:id" element={withSuspense(ListingDetail)} />
    <Route path="/stores" element={withSuspense(Stores)} />
    <Route path="/stores/apply" element={withSuspense(StoreApply)} />
    <Route path="/map" element={withSuspense(ComplexMap)} />
    <Route path="/stores/:id/manage" element={<RequireAuth>{withSuspense(StoreManage)}</RequireAuth>} />
    <Route path="/stores/inside/:shop_no" element={withSuspense(StoreDetail)} />
    <Route path="/stores/outside/:slug" element={withSuspense(StoreDetail)} />
    <Route path="/stores/:slug" element={withSuspense(StoreDetail)} />
    <Route path="/my-subscription" element={<RequireAuth>{withSuspense(MySubscription)}</RequireAuth>} />
    
    {/* User Routes */}
    <Route path="/user" element={<RequireAuth allowedRoles={["user"]}><Suspense fallback={<RouteFallback />}><UserDashboard /></Suspense></RequireAuth>} />
    <Route path="/user/me" element={<RequireAuth allowedRoles={["user"]}><Suspense fallback={<RouteFallback />}><UserProfilePage /></Suspense></RequireAuth>} />
    <Route path="/user/settings" element={<RequireAuth allowedRoles={["user"]}><Suspense fallback={<RouteFallback />}><UserSettingsPage /></Suspense></RequireAuth>} />
    <Route path="/user/history" element={<RequireAuth allowedRoles={["user"]}><Suspense fallback={<RouteFallback />}><UserHistoryCenter /></Suspense></RequireAuth>} />
    <Route path="/user/notifications" element={<RequireAuth><Suspense fallback={<RouteFallback />}><UserNotificationsPage /></Suspense></RequireAuth>} />
    <Route path="/user/orders" element={<RequireAuth allowedRoles={["user"]}><Suspense fallback={<RouteFallback />}><UserHistoryCenter defaultTab="orders" /></Suspense></RequireAuth>} />
    <Route path="/user/repairs" element={<RequireAuth allowedRoles={["user"]}><Suspense fallback={<RouteFallback />}><UserHistoryCenter defaultTab="repairs" /></Suspense></RequireAuth>} />
    <Route path="/user/unlocking" element={<RequireAuth allowedRoles={["user"]}><Suspense fallback={<RouteFallback />}><UserHistoryCenter defaultTab="unlocks" /></Suspense></RequireAuth>} />
    <Route path="/user/exchanges" element={<RequireAuth allowedRoles={["user"]}><Suspense fallback={<RouteFallback />}><UserHistoryCenter defaultTab="exchanges" /></Suspense></RequireAuth>} />
    <Route path="/user/listings" element={<RequireAuth allowedRoles={["user"]}><Suspense fallback={<RouteFallback />}><UserHistoryCenter defaultTab="listings" /></Suspense></RequireAuth>} />

    {/* Redirects */}
    <Route path="/profile" element={withSuspense(ProfileRedirect)} />
    <Route path="/profile/*" element={withSuspense(ProfileRedirect)} />
    <Route path="/account" element={withSuspense(ProfileRedirect)} />
    <Route path="/dashboard" element={withSuspense(DashboardRedirect)} />
    <Route path="/store-admin/*" element={<WildcardRedirect from="/store-admin" to="/storeadmin" />} />
    <Route path="/staff/*" element={<WildcardRedirect from="/staff" to="/staffadmin" />} />
    
    <Route path="/repair" element={withSuspense(RepairHub)} />
    <Route path="/unlocking" element={withSuspense(UnlockingHub)} />
    <Route path="/search/:slug" element={withSuspense(AutoSearchLandingPage)} />
    <Route path="/repair/device/:slug" element={withSuspense(DeviceDetail)} />
    <Route path="/repair/guide/:slug" element={withSuspense(GuideDetailRepair)} />
    <Route path="/repair/track" element={withSuspense(RepairTracking)} />
    <Route path="/repair-tracking" element={withSuspense(RepairTracking)} />
    <Route path="/repair/custom" element={withSuspense(CustomRepairRequest)} />
    <Route path="/news" element={withSuspense(News)} />
    <Route path="/reviews" element={withSuspense(Reviews)} />
    <Route path="/buy" element={<Navigate to="/cat/mobiles?tab=buy" replace />} />
    <Route path="/products" element={<Navigate to="/cat/mobiles?tab=buy" replace />} />
    <Route path="/brands" element={withSuspense(Brands)} />
    <Route path="/cat/mobiles" element={withSuspense(MobileCategoryPage)} />
    <Route path="/cat/mobiles/:brand" element={withSuspense(MobileBrandPage)} />
    <Route path="/mobile-price" element={<Navigate to="/cat/mobiles" replace />} />
    <Route path="/mobile-price/brand/:brand" element={<RedirectBrandToNew />} />
    <Route path="/mobile-price/:slug" element={<RedirectModelToNew />} />
    <Route path="/laptop-price" element={withSuspense(LaptopPrice)} />
    <Route path="/article/:slug" element={withSuspense(ArticleDetail)} />
    <Route path="/guide/:slug" element={withSuspense(GuideDetail)} />
    <Route path="/product/:slug" element={withSuspense(ProductDetail)} />
    <Route path="/mobile/:slug" element={withSuspense(ModelDetailPage)} />
    <Route path="/brand/:brand" element={withSuspense(BrandProducts)} />
    <Route path="/mobile-guides" element={withSuspense(MobileGuides)} />
    <Route path="/laptop-guides" element={withSuspense(LaptopGuides)} />
    <Route path="/compare" element={withSuspense(Compare)} />
    
    {/* Content Pages */}
    <Route path="/privacy-policy" element={
      <Suspense fallback={<RouteFallback />}>
        <ContentPage slug="privacy-policy" />
      </Suspense>
    } />
    <Route path="/terms-of-service" element={
      <Suspense fallback={<RouteFallback />}>
        <ContentPage slug="terms-of-service" />
      </Suspense>
    } />
    <Route path="/about-us" element={
      <Suspense fallback={<RouteFallback />}>
        <ContentPage slug="about-us" />
      </Suspense>
    } />
    <Route path="/contact-us" element={withSuspense(ContactUs)} />
    <Route path="/contact" element={<Navigate to="/contact-us" replace />} />
    <Route path="/about" element={<Navigate to="/about-us" replace />} />
    <Route path="/privacy" element={<Navigate to="/privacy-policy" replace />} />
    <Route path="/terms" element={<Navigate to="/terms-of-service" replace />} />
    <Route path="/sell" element={<Navigate to="/sell-your-phone" replace />} />
    <Route path="/exchange" element={<Navigate to="/sell-your-phone?mode=exchange" replace />} />
    <Route path="/repairs" element={<Navigate to="/repair" replace />} />
    <Route path="/shop" element={<Navigate to="/cat/mobiles?tab=buy" replace />} />
    <Route path="/explore" element={<Navigate to="/cat/mobiles?tab=buy" replace />} />
    <Route path="/prices" element={<Navigate to="/mobile-price" replace />} />
    <Route path="/newsroom" element={<Navigate to="/news" replace />} />
    <Route path="/guides" element={<Navigate to="/mobile-guides" replace />} />
    <Route path="/apply-store" element={<Navigate to="/stores/apply" replace />} />
    <Route path="/store/:id" element={<ParamRouteRedirect to="/stores/:id" />} />
    <Route path="/listing/:id" element={<ParamRouteRedirect to="/marketplace/listing/:id" />} />
    
    {/* Legacy single-segment store URLs -> canonical store route */}
    <Route path="/:slug" element={withSuspense(StoreRedirect)} />
  </>
);
