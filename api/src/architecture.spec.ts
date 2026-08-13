import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const FORBIDDEN_PREFIXES = ['@nestjs/', 'mongoose', 'axios'];
const IMPORT_REGEX = /from\s+["']([^"']+)["']/g;

function findDomainDirs(root: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(root)) {
    const full = join(root, entry);
    if (!statSync(full).isDirectory()) continue;
    if (entry === 'domain') {
      result.push(full);
      continue;
    }
    result.push(...findDomainDirs(full));
  }
  return result;
}

function findTsFiles(dir: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      result.push(...findTsFiles(full));
    } else if (entry.endsWith('.ts') && !entry.endsWith('.spec.ts')) {
      result.push(full);
    }
  }
  return result;
}

function importsOf(file: string): string[] {
  const content = readFileSync(file, 'utf-8');
  const specifiers: string[] = [];
  for (const match of content.matchAll(IMPORT_REGEX)) {
    const specifier = match[1];
    if (specifier) specifiers.push(specifier);
  }
  return specifiers;
}

describe('Arquitetura: domain não pode depender de infraestrutura', () => {
  const modulesRoot = join(__dirname, 'modules');
  const domainDirs = findDomainDirs(modulesRoot);

  it('existe ao menos um contexto com domain/ para o teste ter sentido', () => {
    expect(domainDirs.length).toBeGreaterThan(0);
  });

  for (const domainDir of domainDirs) {
    for (const file of findTsFiles(domainDir)) {
      const relativePath = file.replace(modulesRoot, '');

      it(`${relativePath} não importa @nestjs/*, mongoose, axios ou infrastructure/**`, () => {
        const violations = importsOf(file).filter(
          (specifier) =>
            FORBIDDEN_PREFIXES.some((prefix) => specifier.startsWith(prefix)) ||
            specifier.includes('/infrastructure/') ||
            specifier.includes('\\infrastructure\\'),
        );
        expect(violations).toEqual([]);
      });
    }
  }
});
