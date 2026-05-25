import type { Schema, Struct } from '@strapi/strapi';

export interface SharedExpertNetFaqItem extends Struct.ComponentSchema {
  collectionName: 'components_shared_expert_net_faq_items';
  info: {
    description: 'One FAQ entry for the Expert Advisory Network page';
    displayName: 'Expert Net FAQ Item';
    icon: 'question';
  };
  attributes: {
    answer: Schema.Attribute.Text & Schema.Attribute.Required;
    category: Schema.Attribute.String & Schema.Attribute.Required;
    question: Schema.Attribute.String & Schema.Attribute.Required;
    sort_order: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.expert-net-faq-item': SharedExpertNetFaqItem;
    }
  }
}
