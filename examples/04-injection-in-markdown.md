# Injection test in Markdown

- Interpolation: {{ user.name || 'anon' }}
- Raw: {{= trustedHtml }}
- Control: {% if enabled %}enabled{% else %}disabled{% endif %}
- Comment: {# comment #}

```html
<div title="{{ title | trim }}">test</div>
```
