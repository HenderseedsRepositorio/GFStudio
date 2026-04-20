#!/usr/bin/env node

/**
 * GF Studio — Smoke Test Suite
 * Ejecuta validaciones automatizadas:
 * - HTML bien formado
 * - CDN links accesibles
 * - Archivo sizes
 * - Problemas comunes de JS
 *
 * Uso: node tests/test-smoke.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.bright}${msg}${colors.reset}`)
};

// Test results tracker
let results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

/**
 * Check if URL is accessible
 */
async function checkUrl(url) {
  return new Promise((resolve) => {
    const module = url.startsWith('https') ? https : http;
    const timeoutHandle = setTimeout(() => {
      resolve(false);
    }, 5000);

    const req = module.request(url, { method: 'HEAD' }, (res) => {
      clearTimeout(timeoutHandle);
      resolve(res.statusCode >= 200 && res.statusCode < 300);
    });

    req.on('error', () => {
      clearTimeout(timeoutHandle);
      resolve(false);
    });

    req.end();
  });
}

/**
 * Extract URLs from HTML file
 */
function extractUrls(htmlContent) {
  const urlPatterns = [
    /<script[^>]+src=["']([^"']+)["']/g,
    /<link[^>]+href=["']([^"']+)["']/g,
    /<img[^>]+src=["']([^"']+)["']/g
  ];

  const urls = new Set();

  urlPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(htmlContent)) !== null) {
      let url = match[1];
      if (url.startsWith('http') || url.startsWith('//')) {
        if (url.startsWith('//')) url = 'https:' + url;
        urls.add(url);
      }
    }
  });

  return Array.from(urls);
}

/**
 * Check for common JS issues
 */
function checkJsIssues(content) {
  const issues = [];

  // Check for console.log left in code
  const consoleMatches = content.match(/console\.(log|error|warn|debug)\s*\(/g);
  if (consoleMatches) {
    issues.push({
      type: 'console',
      count: consoleMatches.length,
      message: `Found ${consoleMatches.length} console.log/error/warn calls`
    });
  }

  // Check for TODO/FIXME comments
  const todoMatches = content.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/g);
  if (todoMatches) {
    issues.push({
      type: 'todo',
      count: todoMatches.length,
      message: `Found ${todoMatches.length} TODO/FIXME comments`
    });
  }

  // Check for debugger statements
  if (content.includes('debugger')) {
    issues.push({
      type: 'debugger',
      count: 1,
      message: 'Found debugger statement'
    });
  }

  // Check for inline styles (discouraged)
  const inlineStyles = content.match(/style\s*=\s*["'][^"']*["']/g);
  if (inlineStyles && inlineStyles.length > 5) {
    issues.push({
      type: 'inline-styles',
      count: inlineStyles.length,
      message: `Found ${inlineStyles.length} inline styles (consider CSS)`
    });
  }

  return issues;
}

/**
 * Validate HTML structure
 */
function validateHtml(content, filename) {
  const errors = [];

  // Check for basic structure
  if (!content.includes('<!DOCTYPE')) {
    errors.push('Missing DOCTYPE declaration');
  }

  if (!content.includes('<html')) {
    errors.push('Missing <html> tag');
  }

  if (!content.includes('<head')) {
    errors.push('Missing <head> tag');
  }

  if (!content.includes('<body')) {
    errors.push('Missing <body> tag');
  }

  // Check for matching tags (simple check, ignore React components)
  const tags = content.match(/<\/?(\w+)[^>]*>/g) || [];
  const openTags = {};

  // Standard HTML tags to check for unclosed (ignore custom React components)
  const standardHtmlTags = [
    'html', 'head', 'body', 'div', 'section', 'article', 'nav', 'aside',
    'header', 'footer', 'main', 'form', 'fieldset', 'ul', 'ol', 'li',
    'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th'
  ];

  tags.forEach(tag => {
    const match = tag.match(/<\/?(\w+)/);
    if (match) {
      const tagName = match[1].toLowerCase();
      // Self-closing tags
      const selfClosing = ['br', 'hr', 'img', 'input', 'meta', 'link', 'embed', 'source'];

      // Only track standard HTML tags, not custom React components
      if (standardHtmlTags.includes(tagName)) {
        if (tag.startsWith('</')) {
          if (openTags[tagName]) {
            openTags[tagName]--;
          }
        } else if (!selfClosing.includes(tagName) && !tag.endsWith('/>')) {
          openTags[tagName] = (openTags[tagName] || 0) + 1;
        }
      }
    }
  });

  // Check for unclosed standard HTML tags only
  for (const [tag, count] of Object.entries(openTags)) {
    if (count > 0) {
      errors.push(`Possibly unclosed <${tag}> tags (${count})`);
    }
  }

  // Check for missing charset
  if (!content.includes('charset')) {
    errors.push('Missing charset declaration');
  }

  // Check for viewport meta tag
  if (!content.includes('viewport')) {
    errors.push('Missing viewport meta tag');
  }

  return errors;
}

/**
 * Get file size in KB
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return (stats.size / 1024).toFixed(2);
  } catch {
    return null;
  }
}

/**
 * Main test execution
 */
async function runTests() {
  log.header('🧪 GF STUDIO — SMOKE TEST SUITE');
  log.info(`Started at ${new Date().toLocaleString('es-AR')}`);

  const projectRoot = path.join(__dirname, '..');
  const indexPath = path.join(projectRoot, 'index.html');
  const adminPath = path.join(projectRoot, 'admin.html');

  // Test 1: File Existence
  log.section('1️⃣  VALIDACIÓN DE ARCHIVOS');

  let indexContent = null;
  let adminContent = null;

  if (fs.existsSync(indexPath)) {
    log.success(`index.html existe`);
    results.passed++;
    try {
      indexContent = fs.readFileSync(indexPath, 'utf8');
    } catch (e) {
      log.error(`No se pudo leer index.html: ${e.message}`);
      results.failed++;
    }
  } else {
    log.error(`index.html NO existe`);
    results.failed++;
  }

  if (fs.existsSync(adminPath)) {
    log.success(`admin.html existe`);
    results.passed++;
    try {
      adminContent = fs.readFileSync(adminPath, 'utf8');
    } catch (e) {
      log.error(`No se pudo leer admin.html: ${e.message}`);
      results.failed++;
    }
  } else {
    log.error(`admin.html NO existe`);
    results.failed++;
  }

  // Test 2: File Sizes
  log.section('2️⃣  TAMAÑO DE ARCHIVOS');

  const indexSize = getFileSize(indexPath);
  const adminSize = getFileSize(adminPath);

  if (indexSize) {
    if (parseFloat(indexSize) < 150) {
      log.success(`index.html: ${indexSize}KB (< 150KB ✓)`);
      results.passed++;
    } else {
      log.warn(`index.html: ${indexSize}KB (⚠ supera 150KB recomendado)`);
      results.warnings++;
    }
  }

  if (adminSize) {
    if (parseFloat(adminSize) < 180) {
      log.success(`admin.html: ${adminSize}KB (< 180KB ✓)`);
      results.passed++;
    } else {
      log.warn(`admin.html: ${adminSize}KB (⚠ supera 180KB recomendado)`);
      results.warnings++;
    }
  }

  // Test 3: HTML Validation
  log.section('3️⃣  VALIDACIÓN HTML');

  if (indexContent) {
    const indexErrors = validateHtml(indexContent, 'index.html');
    if (indexErrors.length === 0) {
      log.success(`index.html: HTML válido`);
      results.passed++;
    } else {
      indexErrors.forEach(err => log.warn(`index.html: ${err}`));
      results.warnings += indexErrors.length;
    }
  }

  if (adminContent) {
    const adminErrors = validateHtml(adminContent, 'admin.html');
    if (adminErrors.length === 0) {
      log.success(`admin.html: HTML válido`);
      results.passed++;
    } else {
      adminErrors.forEach(err => log.warn(`admin.html: ${err}`));
      results.warnings += adminErrors.length;
    }
  }

  // Test 4: CDN Links Accessibility
  log.section('4️⃣  VALIDACIÓN DE CDN LINKS');

  const cdnUrls = new Set();

  if (indexContent) {
    extractUrls(indexContent).forEach(url => cdnUrls.add(url));
  }

  if (adminContent) {
    extractUrls(adminContent).forEach(url => cdnUrls.add(url));
  }

  log.info(`Verificando ${cdnUrls.size} URLs de CDN (puede fallar offline)...`);

  let urlsPassed = 0;
  let urlsFailed = 0;
  let cdnCheckError = false;

  for (const url of cdnUrls) {
    const accessible = await checkUrl(url);
    if (accessible) {
      log.success(`${url}`);
      urlsPassed++;
    } else {
      // CDN check failures are only warnings if internet is down
      log.warn(`${url} — No accesible (offline?)`);
      urlsFailed++;
    }
  }

  if (urlsFailed === 0) {
    log.success(`Todas las URLs de CDN accesibles`);
    results.passed++;
  } else {
    log.info(`${urlsFailed} URLs no accesibles (verifica conexión a internet)`);
    results.warnings += urlsFailed;
  }

  // Test 5: Supabase Configuration
  log.section('5️⃣  VALIDACIÓN SUPABASE');

  let hasSupabaseUrl = false;
  let hasSupabaseKey = false;

  if (indexContent) {
    hasSupabaseUrl = indexContent.includes('supabase') && indexContent.includes('supabase.co');
    hasSupabaseKey = indexContent.includes('SB_KEY') || indexContent.includes('supabaseKey') ||
                     (indexContent.includes('supabase') && indexContent.includes('createClient'));
  }

  if (hasSupabaseUrl) {
    log.success(`Supabase URL configurada`);
    results.passed++;
  } else {
    log.error(`Supabase URL NO encontrada`);
    results.failed++;
  }

  if (hasSupabaseKey) {
    log.success(`Supabase Key configurada`);
    results.passed++;
  } else {
    log.error(`Supabase Key NO encontrada`);
    results.failed++;
  }

  // Test 6: JavaScript Issues
  log.section('6️⃣  ANÁLISIS DE CÓDIGO JS');

  if (indexContent) {
    const issues = checkJsIssues(indexContent);
    if (issues.length === 0) {
      log.success(`index.html: Sin problemas detectados`);
      results.passed++;
    } else {
      issues.forEach(issue => {
        log.warn(`index.html: ${issue.message}`);
        results.warnings++;
      });
    }
  }

  if (adminContent) {
    const issues = checkJsIssues(adminContent);
    if (issues.length === 0) {
      log.success(`admin.html: Sin problemas detectados`);
      results.passed++;
    } else {
      issues.forEach(issue => {
        log.warn(`admin.html: ${issue.message}`);
        results.warnings++;
      });
    }
  }

  // Test 7: Security Checks
  log.section('7️⃣  VERIFICACIÓN DE SEGURIDAD');

  let hasXssProtection = true;
  let hasSecurityHeaders = false;

  if (indexContent && adminContent) {
    // Check for obvious XSS risks
    const dangerousPatterns = [
      'dangerouslySetInnerHTML',
      'eval(',
      'innerHTML ='
    ];

    let xssRisks = 0;
    dangerousPatterns.forEach(pattern => {
      if (indexContent.includes(pattern)) xssRisks++;
      if (adminContent.includes(pattern)) xssRisks++;
    });

    if (xssRisks === 0) {
      log.success(`Sin patrones XSS obvios detectados`);
      results.passed++;
    } else {
      log.warn(`Posibles riesgos XSS: ${xssRisks} patrones peligrosos`);
      results.warnings++;
    }
  }

  // Meta tags security
  if (indexContent && indexContent.toLowerCase().includes('content-security-policy')) {
    log.success(`Content Security Policy presente`);
    results.passed++;
  } else {
    log.warn(`CSP no encontrado (recomendado en Vercel)`);
    results.warnings++;
  }

  // Test 8: Performance Indicators
  log.section('8️⃣  INDICADORES DE PERFORMANCE');

  if (indexContent && indexContent.includes('async') && indexContent.includes('defer')) {
    log.success(`Scripts tienen async/defer (good practice)`);
    results.passed++;
  } else {
    log.info(`Algunos scripts podrían usar async/defer`);
  }

  if (indexContent && indexContent.includes('preconnect')) {
    log.success(`Preconexiones DNS configuradas`);
    results.passed++;
  }

  // Summary
  log.header('📊 RESUMEN DE RESULTADOS');

  const totalTests = results.passed + results.failed + results.warnings;
  const passPercentage = totalTests > 0 ? Math.round((results.passed / totalTests) * 100) : 0;

  console.log(`
${colors.bright}┌─────────────────────────────────┐${colors.reset}
${colors.bright}│         TEST SUMMARY            │${colors.reset}
${colors.bright}├─────────────────────────────────┤${colors.reset}
${colors.green}✓ Pasados:       ${results.passed.toString().padEnd(18)}${colors.reset}
${colors.yellow}⚠ Advertencias:  ${results.warnings.toString().padEnd(18)}${colors.reset}
${colors.red}✗ Fallados:      ${results.failed.toString().padEnd(18)}${colors.reset}
${colors.bright}├─────────────────────────────────┤${colors.reset}
${colors.bright}Total:          ${totalTests.toString().padEnd(18)}${colors.reset}
${colors.bright}Completitud:    ${passPercentage}%${colors.reset}
${colors.bright}└─────────────────────────────────┘${colors.reset}
  `);

  if (results.failed === 0 && results.warnings <= 2) {
    log.success(`✓ SMOKE TEST PASSED — Código listo para deploy`);
    process.exit(0);
  } else if (results.failed === 0) {
    log.warn(`⚠ SMOKE TEST PASSED con advertencias — Revisar items marcados`);
    process.exit(0);
  } else {
    log.error(`✗ SMOKE TEST FAILED — Corregir errors antes de deploy`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  log.error(`Error during testing: ${err.message}`);
  process.exit(1);
});
