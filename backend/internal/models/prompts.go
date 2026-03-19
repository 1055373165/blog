package models

// Prompt 提示词模型
type Prompt struct {
	BaseModel
	Name             string   `json:"name" gorm:"not null;size:255;index"`
	Slug             string   `json:"slug" gorm:"uniqueIndex;not null;size:255"`
	Description      string   `json:"description" gorm:"type:text"`
	Content          string   `json:"content" gorm:"type:longtext"`
	Notes            string   `json:"notes" gorm:"type:text"`
	Status           string   `json:"status" gorm:"not null;size:20;default:'draft';index"`
	Tags             []string `json:"tags" gorm:"serializer:json;type:longtext"`
	ApplicableModels []string `json:"applicable_models" gorm:"serializer:json;type:longtext"`
	ParentID         *uint    `json:"parent_id" gorm:"index"`
	SortOrder        int      `json:"sort_order" gorm:"default:0;index"`
	AuthorID         uint     `json:"author_id" gorm:"not null;index"`
	ChildCount       int      `json:"child_count" gorm:"-"`

	Parent   *Prompt  `json:"parent,omitempty" gorm:"foreignKey:ParentID"`
	Children []Prompt `json:"children,omitempty" gorm:"foreignKey:ParentID"`
	Author   User     `json:"author,omitempty" gorm:"foreignKey:AuthorID"`
}
