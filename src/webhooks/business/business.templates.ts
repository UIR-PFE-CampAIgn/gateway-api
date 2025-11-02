/**
 * Generates a structured, ML-optimized content string for business vector embedding.
 * Format is designed to be both natural language friendly and easy to parse.
 */
export function generateBusinessVectorContent(business: {
    name: string;
    description?: string;
    industry?: string;
    website?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
  }): string {
    const content: string[] = [];
  
    // 1. Business Identity
    content.push(`The business name is "${business.name}".`);
  
    // 2. Industry Classification
    if (business.industry) {
      content.push(`This business operates in the ${business.industry} industry.`);
    }
  
    // 3. Business Description
    if (business.description) {
      content.push(`Business description: ${business.description}`);
    }
  
    // 4. Location Information
    const hasLocation = business.address || business.city || business.country;
    if (hasLocation) {
      const locationParts: string[] = [];
      
      if (business.address) {
        locationParts.push(`at ${business.address}`);
      }
      
      if (business.city) {
        locationParts.push(`in ${business.city}`);
      }
      
      if (business.country) {
        locationParts.push(business.country);
      }
      
      content.push(`The business is located ${locationParts.join(', ')}.`);
    }
  
    // 5. Contact Information
    const contactInfo: string[] = [];
    
    if (business.phone) {
      contactInfo.push(`The business phone number is ${business.phone}.`);
    }
    
    if (business.email) {
      contactInfo.push(`The business email address is ${business.email}.`);
    }
    
    if (business.website) {
      contactInfo.push(`The business website is ${business.website}.`);
    }
    
    if (contactInfo.length > 0) {
      content.push(...contactInfo);
    }
  
    // Join with spaces for clean, readable text
    return content.join(' ');
  }
  
  /**
   * Example output:
   * 
   * "The business name is "Acme Corp". This business operates in the Technology industry. 
   * Business description: Leading provider of innovative software solutions for enterprise clients. 
   * The business is located at 123 Main Street, in San Francisco, United States. 
   * The business phone number is +1-555-0123. The business email address is contact@acme.com. 
   * The business website is https://acme.com."
   */