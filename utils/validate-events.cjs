#!/usr/bin/env node

/**
 * Event Data Validator
 * 
 * Validates the event data JSON file for correctness.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const eventsFilePath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(__dirname, '..', 'public', 'data', 'events.json');

function getKnownItemIds() {
  const inventoryPath = path.join(__dirname, '..', 'src', 'game', 'inventory.ts');
  const source = ts.createSourceFile(inventoryPath, fs.readFileSync(inventoryPath, 'utf8'), ts.ScriptTarget.Latest, true);
  const declaration = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((entry) => entry.name.getText(source) === 'ITEMS');
  if (!declaration || !ts.isObjectLiteralExpression(declaration.initializer)) {
    throw new Error('Unable to read ITEMS catalogue from src/game/inventory.ts');
  }
  return new Set(declaration.initializer.properties
    .filter(ts.isPropertyAssignment)
    .map((entry) => entry.name.getText(source).replace(/^['"]|['"]$/g, '')));
}

function validateEvents() {
  console.log('=== Event Data Validator ===\n');
  
  // Check if file exists
  if (!fs.existsSync(eventsFilePath)) {
    console.error(`❌ Events file not found: ${eventsFilePath}`);
    process.exit(1);
  }
  
  // Read and parse JSON
  let data;
  try {
    const fileContent = fs.readFileSync(eventsFilePath, 'utf8');
    data = JSON.parse(fileContent);
    console.log('✓ JSON is valid');
  } catch (error) {
    console.error('❌ Invalid JSON:', error.message);
    process.exit(1);
  }
  
  // Validate structure
  if (!data.version) {
    console.warn('⚠️  Missing version field');
  } else {
    console.log(`✓ Version: ${data.version}`);
  }
  
  if (!Array.isArray(data.events)) {
    console.error('❌ events field must be an array');
    process.exit(1);
  }
  console.log(`✓ Found ${data.events.length} events`);
  
  // Validate each event
  const eventIds = new Set();
  const errors = [];
  const warnings = [];
  const knownItemIds = getKnownItemIds();
  
  data.events.forEach((event, index) => {
    const eventNum = index + 1;
    
    // Required fields
    if (!event.id) {
      errors.push(`Event #${eventNum}: Missing id`);
    } else {
      if (eventIds.has(event.id)) {
        errors.push(`Event #${eventNum}: Duplicate id '${event.id}'`);
      }
      eventIds.add(event.id);
    }
    
    if (!event.title) {
      errors.push(`Event ${event.id || eventNum}: Missing title`);
    }
    
    if (!event.description) {
      errors.push(`Event ${event.id || eventNum}: Missing description`);
    }
    
    if (!Array.isArray(event.choices) || event.choices.length === 0) {
      errors.push(`Event ${event.id || eventNum}: Must have at least one choice`);
    } else {
      // Validate choices
      const choiceIds = new Set();
      event.choices.forEach((choice, choiceIndex) => {
        if (!choice.id) {
          errors.push(`Event ${event.id || eventNum}, Choice #${choiceIndex + 1}: Missing id`);
        } else if (choiceIds.has(choice.id)) {
          errors.push(`Event ${event.id || eventNum}: Duplicate choice id '${choice.id}'`);
        }
        choiceIds.add(choice.id);
        
        if (!choice.label) {
          errors.push(`Event ${event.id || eventNum}, Choice ${choice.id || choiceIndex + 1}: Missing label`);
        }
        
        if (!choice.effects) {
          warnings.push(`Event ${event.id || eventNum}, Choice ${choice.id || choiceIndex + 1}: No effects defined`);
        }
        const label = `Event ${event.id || eventNum}, Choice ${choice.id || choiceIndex + 1}`;
        if (choice.requiresFlags !== undefined &&
            (typeof choice.requiresFlags !== 'object' || choice.requiresFlags === null ||
             Array.isArray(choice.requiresFlags) ||
             Object.entries(choice.requiresFlags).some(([flag, required]) => !flag || typeof required !== 'boolean'))) {
          errors.push(`${label}: requiresFlags must map flag names to booleans`);
        }
        if (choice.requiresMinSanity !== undefined &&
            (!Number.isFinite(choice.requiresMinSanity) || choice.requiresMinSanity < 0)) {
          errors.push(`${label}: requiresMinSanity must be a non-negative number`);
        }
        for (const field of ['requiresItems', 'removeItems', 'addItems']) {
          const items = field === 'requiresItems' ? choice.requiresItems : choice.effects?.[field];
          if (items === undefined) continue;
          if (!Array.isArray(items) || items.some((id) => typeof id !== 'string' || !knownItemIds.has(id))) {
            errors.push(`${label}: ${field} must contain known item IDs`);
          }
        }
      });
    }
    
    // Validate metadata if present
    if (event.metadata) {
      if (event.metadata.id !== event.id) {
        warnings.push(`Event ${event.id || eventNum}: metadata.id doesn't match event.id`);
      }
      if (event.metadata.repeatable !== undefined && typeof event.metadata.repeatable !== 'boolean') {
        errors.push(`Event ${event.id}: metadata.repeatable must be boolean`);
      }
      
      const validCategories = ['mandatory', 'optional', 'character_specific', 'environmental'];
      if (event.metadata.category && !validCategories.includes(event.metadata.category)) {
        warnings.push(`Event ${event.id}: Invalid category '${event.metadata.category}'`);
      }
      
      const validCharacters = ['elias', 'miriam', 'subject13', 'anya'];
      if (event.metadata.characterFocus && !validCharacters.includes(event.metadata.characterFocus)) {
        warnings.push(`Event ${event.id}: Invalid characterFocus '${event.metadata.characterFocus}'`);
      }
    }
  });
  
  // Validate pools
  if (data.pools) {
    console.log(`✓ Found ${data.pools.length} event pools`);
    
    data.pools.forEach((pool) => {
      if (!pool.id) {
        errors.push('Pool missing id');
      }
      
      if (!Array.isArray(pool.events)) {
        errors.push(`Pool ${pool.id || 'unknown'}: events must be an array`);
      } else {
        // Check that referenced events exist
        pool.events.forEach((eventId) => {
          if (!eventIds.has(eventId)) {
            warnings.push(`Pool ${pool.id}: References unknown event '${eventId}'`);
          }
        });
      }
      
      const validStrategies = ['random', 'weighted', 'sequential'];
      if (pool.selectionStrategy && !validStrategies.includes(pool.selectionStrategy)) {
        warnings.push(`Pool ${pool.id}: Invalid selectionStrategy '${pool.selectionStrategy}'`);
      }
    });
  }
  
  // Report results
  console.log('\n=== Validation Results ===\n');
  
  if (errors.length > 0) {
    console.error(`❌ ${errors.length} error(s) found:\n`);
    errors.forEach(err => console.error(`  - ${err}`));
  } else {
    console.log('✓ No errors found');
  }
  
  if (warnings.length > 0) {
    console.warn(`\n⚠️  ${warnings.length} warning(s):\n`);
    warnings.forEach(warn => console.warn(`  - ${warn}`));
  } else {
    console.log('✓ No warnings');
  }
  
  // Summary
  console.log('\n=== Summary ===\n');
  console.log(`Total events: ${data.events.length}`);
  console.log(`Total pools: ${data.pools ? data.pools.length : 0}`);
  
  const mandatoryEvents = data.events.filter(e => e.metadata?.category === 'mandatory');
  const optionalEvents = data.events.filter(e => e.metadata?.category === 'optional');
  const characterEvents = data.events.filter(e => e.metadata?.category === 'character_specific');
  
  console.log(`  - Mandatory: ${mandatoryEvents.length}`);
  console.log(`  - Optional: ${optionalEvents.length}`);
  console.log(`  - Character-specific: ${characterEvents.length}`);
  
  // Check critical event IDs that are hardcoded in the source
  console.log('\n=== Critical Event Validation ===\n');
  const criticalEventIds = [
    'pit_fall_event',
    'overflow_ward_event', 
    'riot_recording_event',
    'confessional_chair_event'
  ];
  
  criticalEventIds.forEach(eventId => {
    if (eventIds.has(eventId)) {
      console.log(`✓ ${eventId} is defined`);
    } else {
      errors.push(`Critical event missing: ${eventId} (referenced in source code)`);
      console.error(`❌ ${eventId} is missing (but referenced in source code)`);
    }
  });
  
  if (errors.length > 0) {
    console.error('\n❌ Validation failed');
    process.exit(1);
  } else {
    console.log('\n✅ Validation passed');
    process.exit(0);
  }
}

validateEvents();
