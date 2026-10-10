const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../src/routes');
const PAGES_DIR = path.join(__dirname, '../src/pages');
const SRC_DIR = path.join(__dirname, '../src');

// Known API routes defined in server.js/server.cjs
const KNOWN_API_ROUTES = [
  { path: '/api/contact', methods: ['POST'] },
  { path: '/api/orders', methods: ['POST'] },
  { path: '/api/repair-requests', methods: ['POST'] },
  { path: '/api/wishlist', methods: ['POST'] },
];

function getDefinedRoutes() {
  const routes = new Set();
  const routeFiles = fs.readdirSync(ROUTES_DIR)
    .filter(f => f.endsWith('.tsx'))
    .map(file => path.join(ROUTES_DIR, file));
  routeFiles.push(path.join(SRC_DIR, 'App.tsx'));
  
  routeFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Find parent route
    const parentMatch = content.match(/path="(\/[^"]+)"/);
    const parentPath = parentMatch ? parentMatch[1] : '';
    
    // Find all JSX paths: <Route path="...">
    const pathMatches = content.matchAll(/path="([^"]+)"/g);
    for (const match of pathMatches) {
      let route = match[1];
      
      if (route.startsWith('/')) {
        routes.add(route);
      } else if (parentPath) {
        const fullPath = (parentPath + '/' + route).replace(/\/+/g, '/');
        routes.add(fullPath);
        if (route.endsWith('/*')) {
          routes.add(fullPath.replace('/*', ''));
        }
      }
    }

    // Find object route definitions: { path: "/..." }
    const objectPathMatches = content.matchAll(/path:\s*["']([^"']+)["']/g);
    for (const match of objectPathMatches) {
      const route = match[1];
      if (route.startsWith('/')) {
        routes.add(route);
      } else if (parentPath) {
        routes.add((parentPath + '/' + route).replace(/\/+/g, '/'));
      }
    }

    // Also handle index routes
    if (parentPath && content.includes('index')) {
      routes.add(parentPath);
    }
  });
  
  return routes;
}

function checkLinks(definedRoutes) {
  const files = getAllFiles(SRC_DIR);
  let errors = 0;
  
  files.forEach(file => {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
    
    const content = fs.readFileSync(file, 'utf8');
    // Cover JSX props (`to="..."`) and navigation configuration (`href: "..."`).
    const linkMatches = content.matchAll(/(?:to|href)\s*(?:=|:)\s*["']([^"']+)["']/g);
    
    for (const match of linkMatches) {
      const link = match[1];
      
      // Skip external links, dynamic links, anchors, and static files
      if (
        link.startsWith('http') || 
        link.includes('${') || 
        link.startsWith('#') ||
        link.startsWith('mailto:') ||
        link.startsWith('tel:') ||
        !link.startsWith('/') ||
        link === '.' ||
        link.endsWith('.xml') ||
        link.endsWith('.txt')
      ) {
        continue;
      }
      
      // Normalize link (remove trailing slash, remove params)
      const cleanLink = link.split('?')[0].split('#')[0];
      
      if (cleanLink === '/' || cleanLink === '') continue;
      
      // Check if route exists (basic match, doesn't handle params like :id perfectly)
      let found = false;
      for (const route of definedRoutes) {
        const routePattern = route
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          .replace(/:[^/]+/g, '[^/]+')
          .replace(/\\\/\\\*/g, '(?:/.*)?');
        const routeRegex = new RegExp(`^${routePattern}$`);
        if (routeRegex.test(cleanLink)) {
          found = true;
          break;
        }
      }
      
      if (!found && !cleanLink.includes(':')) {
        console.error(`[INVALID LINK] ${file}: ${link}`);
        errors++;
      }
    }
  });
  
  return errors;
}

function checkPlaceholderAdminLinks() {
  const files = getAllFiles(SRC_DIR);
  let errors = 0;

  files.forEach((file) => {
    if (!file.endsWith('.tsx') && !file.endsWith('.ts')) return;
    if (file.includes(`${path.sep}components${path.sep}ui${path.sep}`)) return;

    const content = fs.readFileSync(file, 'utf8');
    if (/href\s*=\s*["']#['"]/.test(content)) {
      console.error(`[PLACEHOLDER LINK] ${file}: found href="#"`);
      errors++;
    }
  });

  return errors;
}

function checkApiRoutes() {
  let errors = 0;
  
  // Check that API routes referenced in frontend code exist in server definitions
  const serverFiles = [
    path.join(__dirname, '../server.js'),
    path.join(__dirname, '../server.cjs'),
  ];
  
  let serverContent = '';
  serverFiles.forEach(f => {
    if (fs.existsSync(f)) {
      serverContent += fs.readFileSync(f, 'utf8') + '\n';
    }
  });
  
  KNOWN_API_ROUTES.forEach(apiRoute => {
    const routePattern = new RegExp(`app\\.(?:post|get|put|delete|patch)\\s*\\(["']${apiRoute.path}["']`);
    if (!routePattern.test(serverContent)) {
      console.error(`[MISSING API ROUTE] ${apiRoute.path} is referenced but not defined in server`);
      errors++;
    }
  });
  
  return errors;
}

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

console.log('Scanning for defined routes...');
const routes = getDefinedRoutes();
console.log(`Found ${routes.size} defined routes.`);

console.log('Checking all links in src/...');
const linkErrors = checkLinks(routes);

console.log('Checking API route consistency...');
const apiErrors = checkApiRoutes();

console.log('Checking for placeholder internal links...');
const placeholderErrors = checkPlaceholderAdminLinks();

const totalErrors = linkErrors + apiErrors + placeholderErrors;

if (totalErrors > 0) {
  console.log(`\nFinished with ${totalErrors} potential route errors.`);
  process.exit(1);
} else {
  console.log('\nAll internal links and API routes seem consistent!');
  process.exit(0);
}
