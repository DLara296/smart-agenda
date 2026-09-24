import React from 'react';

function FamilyForm() {
  return (
    <form>
      <label htmlFor="family-name">Family name</label>
      <input id="family-name" name="familyName" />
      <button type="submit">Register family</button>
    </form>
  );
}

export default FamilyForm;
