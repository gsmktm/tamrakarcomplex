const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '../src/routes');
const PAGES_DIR = path.join(__dirname, '../src/pages');
const SRC_DIR = path.join(__dirname, '../src');

function getDefinedRoutes() {
  const routes = new Set();
  const routeFiles = fs.readdirSync(ROUTES_DIR).filter(f => f.endsWith('.tsx'));
  
  routeFiles.forEach(file => {
    const content = fs.readFileSync(path.join(ROUTES_DIR, file), 'utf8');
    
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
        // Handle relative paths in nested routes
        const fullPath = (parentPath + '/' + route).replace(/\/+/g, '/');
        routes.add(fullPath);
        // Also add the version with trailing asterisk if it exists
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
    const linkMatches = content.matchAll(/to="([^"]+)"|href="([^"]+)"/g);
    
    for (const match of linkMatches) {
      const link = match[1] || match[2];
      
      // Skip external links, dynamic links, anchors, and static files
      if (
        link.startsWith('http') || 
        link.includes('${') || 
        link.startsWith('#') || 
        link.startsWith('mailto:') || 
        link.startsWith('tel:') ||
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
        const routeRegex = new RegExp('^' + route.replace(/:[^\/]+/g, '[^/]+') + '$');
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

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
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
const errorCount = checkLinks(routes);

if (errorCount > 0) {
  console.log(`\nFinished with ${errorCount} potential route errors.`);
  process.exit(1);
} else {
  console.log('\nAll internal links seem to have matching routes!');
  process.exit(0);
}
