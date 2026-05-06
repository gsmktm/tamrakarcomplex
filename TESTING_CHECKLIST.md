# Final Testing Checklist

## Automated Tests Status
- [x] Price List Flow Tests
  - [x] Public can view mobile price
  - [x] Brand filter works
  - [x] Search works
  - [x] Price sort works
  - [x] price_npr numeric sort works
  - [x] Admin can edit price
  - [x] Unverified item does not show publicly

- [x] Brand Flow Tests
  - [x] Brand logo appears
  - [x] Brand aliases normalize
  - [x] OPPO/Oppo/oppo become one brand

- [x] Store Flow Tests
  - [x] Free store only shows basic info
  - [x] Silver contact shows after login
  - [x] Gold appears featured
  - [x] Diamond appears top
  - [x] Store admin edits only own store

- [x] Marketplace Flow Tests
  - [x] Store admin adds listing
  - [x] Super admin approves
  - [x] Public can see active listing
  - [x] Free store cannot list product
  - [x] Diamond listing gets priority

- [x] Sell Phone Flow Tests
  - [x] Brand select works
  - [x] Model select works
  - [x] Quote does not show before name/phone/email
  - [x] Lead saves correctly
  - [x] Super admin sees lead
  - [x] Store admin sees only assigned lead
  - [x] Popular model order updates

- [x] Checkout Flow Tests
  - [x] COD order works
  - [x] eSewa payment does not mark paid before verification
  - [x] Store order appears in store admin
  - [x] Commission is calculated
  - [x] Payout ledger is created

- [x] Repair Flow Tests
  - [x] Public repair request works
  - [x] Tracking ID works
  - [x] Super admin assigns to store
  - [x] Store admin updates repair status

- [x] Security Flow Tests
  - [x] Public user cannot access admin
  - [x] Staff without permission cannot access module
  - [x] Store admin cannot access other store data
  - [x] Production has no demo fallback

## Manual Testing Checklist

### Price List Manual Tests
- [ ] Verify price list displays correctly on mobile devices
- [ ] Test brand filtering on different screen sizes
- [ ] Confirm search functionality works with special characters
- [ ] Test price sorting maintains order after page refresh
- [ ] Verify admin price editing updates reflect immediately
- [ ] Confirm unverified items are hidden from public view

### Brand Manual Tests
- [ ] Check brand logos display correctly in all browsers
- [ ] Test brand alias normalization in search and filters
- [ ] Verify brand consistency across all pages

### Store Manual Tests
- [ ] Test store directory pagination and sorting
- [ ] Verify contact information visibility based on login status
- [ ] Check featured store highlighting
- [ ] Confirm package-based feature restrictions
- [ ] Test store admin permissions and access control

### Marketplace Manual Tests
- [ ] Test listing creation workflow
- [ ] Verify approval process for new listings
- [ ] Check listing visibility for different user types
- [ ] Test marketplace search and filtering
- [ ] Verify package-based listing restrictions

### Sell Phone Manual Tests
- [ ] Test device selection dropdowns
- [ ] Open `/sell-your-phone?brand=Apple&model=iPhone%2015` and verify brand/model prefill reaches the device-details step when catalog data exists
- [ ] From any product detail page, click "Value My Phone" and confirm it lands in the valuation flow with brand/model query params
- [ ] Verify quote calculation accuracy
- [ ] Check form validation for required fields
- [ ] Test lead assignment to stores
- [ ] Verify admin dashboard lead visibility

### Checkout Manual Tests
- [ ] Test COD order completion
- [ ] Verify eSewa payment flow
- [ ] Check order status updates
- [ ] Test commission calculations
- [ ] Verify payout processing

### Repair Manual Tests
- [ ] Test repair request submission
- [ ] Verify tracking system functionality
- [ ] Check store assignment workflow
- [ ] Test status update notifications

### Security Manual Tests
- [ ] Test authentication redirects
- [ ] Verify role-based access control
- [ ] Check data isolation between stores
- [ ] Test production environment security

## Build and Deployment Tests
- [ ] npm build completes successfully
- [ ] No TypeScript errors in build output
- [ ] No console errors in development mode
- [ ] All routes load without 404 errors
- [ ] Static assets load correctly
- [ ] Environment variables configured properly
- [ ] Database connections work in production
- [ ] API endpoints respond correctly

## Performance Tests
- [ ] Page load times under 3 seconds
- [ ] Image optimization working
- [ ] Bundle size within acceptable limits
- [ ] Database queries optimized
- [ ] Caching implemented correctly

## Browser Compatibility Tests
- [ ] Chrome latest version
- [ ] Firefox latest version
- [ ] Safari latest version
- [ ] Edge latest version
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)

## Mobile Responsiveness Tests
- [ ] iPhone SE (375px width)
- [ ] iPhone 12/13 (390px width)
- [ ] iPhone 12/13 Pro Max (428px width)
- [ ] Samsung Galaxy S20 (412px width)
- [ ] iPad (768px width)
- [ ] iPad Pro (1024px width)

## Production Deployment Notes
- [ ] Environment variables documented
- [ ] Database migrations prepared
- [ ] CDN configuration for static assets
- [ ] SSL certificate setup
- [ ] Monitoring and logging configured
- [ ] Backup procedures documented
- [ ] Rollback plan prepared
- [ ] Performance monitoring setup
- [ ] Error tracking configured
